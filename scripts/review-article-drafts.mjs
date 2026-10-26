import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data, error } = await supabase
  .from("posts")
  .select("*")
  .in("id", ["50866e04-53f3-415c-a25a-f7467bdded6d", "e5c0ca0c-a5a1-41f0-8876-70dc372935a5"]);
if (error) throw error;

for (const post of data) {
  const blocks = JSON.parse(post.body);
  const text = blocks.filter((block) => block.type === "text").map((block) => block.content).join("\n");
  const all = [post.title, post.summary, post.image_alt, post.body, JSON.stringify(post.featured_quote)].join(" ");
  console.log("=====", post.title);
  console.log("cjk:", /[\u3400-\u4dbf\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/u.test(all));
  console.log("replacement char:", all.includes("\uFFFD"));
  console.log("question inside word:", /\p{L}\?\p{L}/u.test(all));
  console.log("quote in body:", post.featured_quote?.text ? text.includes(post.featured_quote.text) : "no quote");
  console.log("final source:", /\*\*Fonte:\*\* \[[^\]]+\]\(https:\/\/[^)]+\)/.test(blocks.filter((block) => block.type === "text").at(-1).content));
  console.log("blocks:", blocks.map((block) => block.type).join(" > "));
  console.log("");
  console.log(text);
  console.log("");
}
