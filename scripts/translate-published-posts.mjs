import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const groqKey = process.env.GROQ_API_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Supabase credentials missing in .env.local");
  process.exit(1);
}

if (!groqKey) {
  console.error("GROQ_API_KEY missing in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const args = process.argv.slice(2);
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : args.includes("--all") ? 100 : 30;
const isDryRun = args.includes("--dry-run");
const isForce = args.includes("--force");
const withBody = args.includes("--with-body");

const GROQ_MODEL = "qwen/qwen3.8-27b";

async function fetchGroq(messages, retryCount = 0) {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages,
      }),
      signal: AbortSignal.timeout(35000),
    });

    if (response.status === 429) {
      if (retryCount >= 4) {
        throw new Error("Rate limit exceeded maximum retries");
      }
      const resetHeader = response.headers.get("x-ratelimit-reset-tokens");
      const waitMs = resetHeader ? Math.ceil(parseFloat(resetHeader) * 1000) + 1000 : 7000;
      console.warn(`   Rate limit reached. Backing off for ${Math.round(waitMs / 1000)}s...`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      return fetchGroq(messages, retryCount + 1);
    }

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Groq HTTP ${response.status}: ${err.slice(0, 160)}`);
    }

    const json = await response.json();
    const rawContent = json.choices?.[0]?.message?.content;
    if (!rawContent) throw new Error("Empty response from Groq");
    return JSON.parse(rawContent);
  } catch (err) {
    if (retryCount < 2 && !String(err.message).includes("maximum retries")) {
      console.warn(`   Attempt failed (${err.message}). Retrying in 4s...`);
      await new Promise((resolve) => setTimeout(resolve, 4000));
      return fetchGroq(messages, retryCount + 1);
    }
    throw err;
  }
}

async function translatePost(post) {
  const metaPrompt = `Translate this gaming news title and summary from Brazilian Portuguese to journalistic American English.
Requirements:
1. title_en: Punchy UPPERCASE headline, under 70 characters, no clickbait, no ending period, factual and professional.
2. summary_en: Exactly one sentence, ~140 characters, answering what happened + why it matters.
3. slug_en: Clean kebab-case URL slug based on title_en, max 80 characters.

Title: ${post.title}
Summary: ${post.summary}

Return ONLY a JSON object: {"title_en": "...", "summary_en": "...", "slug_en": "..."}`;

  const metaResult = await fetchGroq([
    { role: "system", content: "You are the English editor of Orange Brick gaming news portal. Output ONLY valid JSON." },
    { role: "user", content: metaPrompt },
  ]);

  const title_en = (metaResult.title_en || "").trim().toUpperCase();
  const summary_en = (metaResult.summary_en || "").trim();
  const slug_en = (metaResult.slug_en || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  let body_en = null;

  if (withBody && post.body) {
    try {
      const parsedBlocks = typeof post.body === "string" ? JSON.parse(post.body) : post.body;
      if (Array.isArray(parsedBlocks) && parsedBlocks.length > 0) {
        const bodyPrompt = `Translate the text block content and image caption/alt into natural English.
Preserve exact block id, type, and url.
Blocks to translate:
${JSON.stringify(parsedBlocks)}

Return ONLY JSON: {"blocks": [ARRAY_OF_BLOCKS]}`;

        const bodyResult = await fetchGroq([
          { role: "system", content: "Translate the provided blocks array to English. Return ONLY JSON." },
          { role: "user", content: bodyPrompt },
        ]);

        if (Array.isArray(bodyResult.blocks)) {
          body_en = JSON.stringify(bodyResult.blocks);
        }
      }
    } catch (bodyError) {
      console.warn(`   Could not translate full body: ${bodyError.message}`);
    }
  }

  return { title_en, summary_en, slug_en, body_en };
}

async function main() {
  console.log(`Starting translation pipeline (Limit: ${limit}, Force: ${isForce}, WithBody: ${withBody}, DryRun: ${isDryRun})...\n`);

  let query = supabase
    .from("posts")
    .select("id, slug, title, summary, body, title_en, published_at")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (!isForce) {
    query = query.is("title_en", null);
  }

  const { data: posts, error } = await query;
  if (error) {
    console.error("Failed to fetch posts:", error.message);
    process.exit(1);
  }

  console.log(`Found ${posts.length} published posts to translate.\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    console.log(`[${i + 1}/${posts.length}] Translating: "${post.title.slice(0, 55)}..."`);

    try {
      const translated = await translatePost(post);
      console.log(`   EN Title: "${translated.title_en}"`);
      console.log(`   EN Slug:  "${translated.slug_en}"`);
      console.log(`   EN Summary: "${translated.summary_en.slice(0, 65)}..."`);

      if (!isDryRun) {
        const updatePayload = {
          title_en: translated.title_en,
          summary_en: translated.summary_en,
          slug_en: translated.slug_en,
        };
        if (translated.body_en) {
          updatePayload.body_en = translated.body_en;
        }

        const { error: updateError } = await supabase
          .from("posts")
          .update(updatePayload)
          .eq("id", post.id);

        if (updateError) {
          console.error(`   Failed to update in database: ${updateError.message}`);
          errorCount++;
        } else {
          console.log(`   Saved in Supabase.`);
          successCount++;
        }
      } else {
        successCount++;
      }
    } catch (err) {
      console.error(`   Translation error: ${err.message}`);
      errorCount++;
    }

    if (i < posts.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
  }

  console.log(`\nTranslation finished! Succeeded: ${successCount}, Failed: ${errorCount}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
