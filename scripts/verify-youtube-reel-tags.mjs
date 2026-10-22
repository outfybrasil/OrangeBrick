import { createClient } from "@supabase/supabase-js";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { callComposio, getYouTubeConnection } from "../src/lib/video/reel-youtube.ts";

function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function loadGenerateSocialCopys() {
  const source = ts.transpileModule(readFileSync(new URL("../src/lib/video/reel-service.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exports = {};
  const require = createRequire(import.meta.url);
  const mockedRequire = name => {
    if (name.endsWith("reel-script")) return {};
    if (name.endsWith("reel-remote")) return { enqueueRemoteReel: async () => ({}), cancelRemoteReel: async () => ({}), usesRemoteReels: () => false };
    return require(name);
  };
  vm.runInNewContext(source, { exports, require: mockedRequire, process, console, setTimeout, clearTimeout, WeakSet });
  return exports.generateSocialCopys;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase não está configurado no ambiente local.");
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const connection = await getYouTubeConnection(true);
  const generateSocialCopys = loadGenerateSocialCopys();
  let { data: publications, error } = await db.from("reel_youtube_publications").select("post_id,video_id,tags").eq("channel_id", connection.channel.id).eq("status", "uploaded").eq("visibility", "public").not("video_id", "is", null).order("updated_at", { ascending: false }).limit(20);
  if (error && /tags/i.test(error.message)) {
    const fallback = await db.from("reel_youtube_publications").select("post_id,video_id").eq("channel_id", connection.channel.id).eq("status", "uploaded").eq("visibility", "public").not("video_id", "is", null).order("updated_at", { ascending: false }).limit(20);
    publications = fallback.data;
    error = fallback.error;
  }
  if (error) throw new Error("Não foi possível consultar os vídeos publicados no banco.");
  if (!publications?.length) throw new Error("Não há vídeos públicos de Reels para conferir.");
  const postIds = publications.map(row => row.post_id);
  const [{ data: posts }, { data: jobs }] = await Promise.all([
    db.from("posts").select("id,slug,title,summary,category").in("id", postIds),
    db.from("reel_jobs").select("post_id,script,created_at").in("post_id", postIds).eq("status", "ready").order("created_at", { ascending: false }),
  ]);
  const postById = new Map((posts || []).map(post => [post.id, post]));
  const scriptByPostId = new Map();
  for (const job of jobs || []) if (!scriptByPostId.has(job.post_id)) scriptByPostId.set(job.post_id, job.script);
  const response = await callComposio("COMPOSIO_MULTI_EXECUTE_TOOL", {
    session_id: connection.session,
    tools: [{ tool_slug: "YOUTUBE_GET_VIDEO_DETAILS_BATCH", arguments: { id: publications.map(row => row.video_id), parts: ["snippet"] } }],
    sync_response_to_workbench: false,
    current_step: "VERIFYING_REEL_TAGS",
  });
  const first = object((Array.isArray(response.results) ? response.results : [])[0]);
  const toolResponse = object(first.response);
  if (toolResponse.successful !== true) throw new Error("O YouTube não autorizou a leitura das tags dos vídeos.");
  const data = object(toolResponse.data);
  const videos = (Array.isArray(data.items) ? data.items : Array.isArray(data.videos) ? data.videos : []).map(object);
  const videosById = new Map(videos.filter(video => typeof video.id === "string").map(video => [video.id, video]));
  const results = publications.map(publication => {
    const video = videosById.get(publication.video_id);
    const actualTags = Array.isArray(object(video?.snippet).tags) ? object(video?.snippet).tags : [];
    const post = postById.get(publication.post_id);
    const expectedTags = publication.tags?.length ? publication.tags : post ? generateSocialCopys({ ...post, script: scriptByPostId.get(publication.post_id) || null }).youtube.tags : [];
    const normalize = tags => [...new Set(tags.map(tag => tag.trim().toLocaleLowerCase("pt-BR")))].sort();
    return { postId: publication.post_id, videoId: publication.video_id, verified: Boolean(video), expectedTags, actualTags, matches: Boolean(video) && JSON.stringify(normalize(expectedTags)) === JSON.stringify(normalize(actualTags)) };
  });
  console.log(JSON.stringify({ channel: connection.channel.title, checked: results.length, verified: results.filter(result => result.verified).length, matches: results.filter(result => result.matches).length, unavailable: results.filter(result => !result.verified), mismatches: results.filter(result => result.verified && !result.matches) }, null, 2));
  if (results.some(result => !result.matches)) process.exitCode = 1;
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : "Falha ao verificar tags do YouTube.");
  process.exitCode = 1;
});
