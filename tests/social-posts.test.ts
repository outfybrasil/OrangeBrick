import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { summarizeSocialText, socialWordCount, SOCIAL_COVER_WORDS, SOCIAL_SLIDE_WORDS, applySocialDefaults, generateSocialCaption, generateSocialDraft, socialPostAssets, validateSocialDraft, socialDraftQualityIssues, type SocialSourcePost } from "../src/lib/social/post-plan.ts";
import { createSocialZip } from "../src/lib/social/zip.ts";

function post(imageCount = 3): SocialSourcePost {
  return { id: "00000000-0000-4000-8000-000000000001", slug: "novas-imagens-gta-vi", title: "Rockstar divulga novas imagens de GTA VI", summary: "As capturas mostram os personagens e as regiões de Leonida.", image_url: "https://official.test/cover.jpg", image_alt: "Jason e Lucia em uma cena oficial de GTA VI.", updated_at: "2026-11-05T12:00:00Z", information_status: "confirmed", body: JSON.stringify(Array.from({ length: imageCount }, (_, i) => [{ id: `text-${i}`, type: "text", content: `## Região ${i}\nTexto original da matéria sobre a região ${i}. **Fonte:** [Rockstar](https://official.test)` }, { id: `image-${i}`, type: "image", url: `https://official.test/${i}.jpg`, alt: `Cenário ${i} mostrado em imagem oficial de GTA VI.`, caption: `Região ${i}. Crédito: Rockstar Games.` }]).flat()) };
}

test("carrossel reserva o CTA dentro de 20 slides, sem repetir imagens", () => {
  const source = post(39);
  const draft = generateSocialDraft(source, "carousel");
  assert.equal(draft.slides.length, 20);
  assert.equal(draft.slides[0].kind, "cover");
  assert.equal(draft.slides.at(-1)?.kind, "cta");
  const urls = draft.slides.map(slide => slide.imageUrl).filter(Boolean);
  assert.equal(new Set(urls).size, urls.length);
  assert.doesNotThrow(() => validateSocialDraft(draft, source));
  assert.ok(draft.slides.every(slide => !slide.text.includes("**Fonte")));
});

test("imagem única mantém a capa e rumores continuam identificados", () => {
  const source = { ...post(), information_status: "rumor" as const };
  const draft = generateSocialDraft(source, "single");
  assert.equal(draft.slides.length, 1);
  assert.match(draft.slides[0].title, /^RUMOR:/);
  assert.match(draft.caption, /^RUMOR:/);
  assert.doesNotThrow(() => validateSocialDraft(draft, source));
});

test("validação bloqueia excesso de slides, imagem externa, repetição e CTA fora de posição", () => {
  const source = post();
  const draft = generateSocialDraft(source, "carousel");
  const mutate = (change: (value: typeof draft) => void) => { const next = structuredClone(draft); change(next); return () => validateSocialDraft(next, source); };
  assert.throws(mutate(value => { value.slides = Array.from({ length: 21 }, () => value.slides[0]); }), /20/);
  assert.throws(mutate(value => { value.slides[1].imageUrl = "https://attacker.test/secret"; }), /vinculadas/);
  assert.throws(mutate(value => { value.slides[1].imageUrl = value.slides[0].imageUrl; }), /diferentes/);
  assert.throws(mutate(value => { value.slides[0].alt = ""; }), /alternativo/);
  assert.throws(mutate(value => { value.slides[1].positionX = Number.NaN; }), /Enquadramento/);
  assert.throws(mutate(value => { value.slides.pop(); }), /CTA/);
  assert.throws(mutate(value => { value.slides[1].kind = "cta"; }), /último/);
});

test("acervo elimina URLs repetidas e conteúdo ausente não cria fatos", () => {
  const source = post(0);
  source.body = JSON.stringify([{ id: "dup", type: "image", url: source.image_url, alt: source.image_alt }]);
  assert.equal(socialPostAssets(source).length, 1);
  const draft = generateSocialDraft(source, "carousel");
  assert.equal(draft.slides.length, 2);
  assert.equal(draft.slides.at(-1)?.kind, "cta");
});

test("ZIP exportado pode ser aberto por leitor independente, com nomes UTF-8 e CRC válido", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "orange-brick-zip-"));
  try {
    const filename = path.join(directory, "post.zip");
    writeFileSync(filename, createSocialZip([{ name: "slides/01.jpg", data: new Uint8Array([255, 216, 255, 217]) }, { name: "legenda-ação.txt", data: new TextEncoder().encode("Curta e siga a página.") }]));
    const result = execFileSync("python3", ["-c", "import sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; assert z.read('legenda-ação.txt').decode() == 'Curta e siga a página.'; assert len(z.namelist()) == 2; print('ok')", filename], { encoding: "utf8" });
    assert.equal(result.trim(), "ok");
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("API exige administrador, mantém rascunhos privados e recusa matéria alterada", async () => {
  const { readFileSync } = await import("node:fs");
  const { default: ts } = await import("typescript");
  const { default: vm } = await import("node:vm");
  const source = post();
  let admin = true;
  let stored = "";
  let failSave = false;
  let bucketPublic: unknown;
  const code = ts.transpileModule(readFileSync(new URL("../src/app/api/admin/social-posts/route.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: "admin" } }, error: null }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: source, error: null }) }) }) }),
    storage: {
      getBucket: async () => ({ data: null, error: { statusCode: "404", message: "Bucket not found" } }),
      createBucket: async (_name: string, options: { public: boolean }) => { bucketPublic = options.public; return { error: null }; },
      from: () => ({
        download: async () => ({ data: stored ? new Blob([stored]) : null, error: stored ? null : { statusCode: "404", message: "Object not found" } }),
        upload: async (_name: string, content: string) => { if (failSave) return { error: { message: "disk full" } }; stored = content; return { error: null }; },
      }),
    },
  };
  const api: { GET?: (request: Request) => Promise<Response>; PUT?: (request: Request) => Promise<Response> } = {};
  vm.runInNewContext(code, { exports: api, process: { env: {} }, Request, Response, Buffer, Date, URL, AbortSignal, Uint8Array, Promise, Set,
    require: (name: string) => {
      if (name === "next/server") return { NextResponse: { json: (value: unknown, init: ResponseInit) => Response.json(value, init) } };
      if (name === "@supabase/supabase-js") return { createClient: () => client };
      if (name === "@/lib/auth") return { isVerifiedAdminSession: () => admin };
      if (name === "@/lib/social/post-plan") return { applySocialDefaults, socialPostAssets, validateSocialDraft };
      if (name === "@/lib/social/post-context") return { enrichSocialPost: async (_db: unknown, post: unknown) => post };
      if (name === "@/lib/server/network") return { readResponseBuffer: async (response: Response) => Buffer.from(await response.arrayBuffer()) };
      if (name === "sharp") return () => {};
      if (name === "node:path") return path;
      if (name === "node:fs/promises") return {};
      throw new Error(name);
    },
  });
  const url = `https://orangebrick.test/api/admin/social-posts?postId=${source.id}`;
  const request = (body: unknown) => new Request(url, { method: "PUT", headers: { Authorization: "Bearer fixture" }, body: JSON.stringify(body) });
  assert.equal((await api.GET!(new Request(url))).status, 401);
  admin = false;
  assert.equal((await api.PUT!(request(generateSocialDraft(source, "single")))).status, 403);
  admin = true;
  const stale = generateSocialDraft(source, "single"); stale.sourceUpdatedAt = "old";
  assert.equal((await api.PUT!(request(stale))).status, 409);
  assert.equal(stored, "");
  const result = await api.PUT!(request(generateSocialDraft(source, "carousel")));
  assert.equal(result.status, 200);
  assert.equal(bucketPublic, false);
  assert.ok(JSON.parse(stored).savedAt);
  const restored = await api.GET!(new Request(url, { headers: { Authorization: "Bearer fixture" } }));
  assert.equal(restored.status, 200);
  assert.equal((await restored.json()).drafts.carousel.postId, source.id);
  failSave = true;
  assert.equal((await api.PUT!(request(generateSocialDraft(source, "single")))).status, 503);
});

test("posts usam a mesma copy editorial dos Reels com cinco hashtags e formato correto", () => {
  const source = { ...post(), category: "breaking" as const };
  const carousel = generateSocialCaption(source, "carousel");
  const single = generateSocialCaption(source, "single");
  assert.match(carousel, /Siga @ob\.labs/);
  assert.doesNotMatch(carousel, /Comenta aí:|Responda nos comentários:/);
  assert.match(carousel, /orangebrick\.blog\/posts\/novas-imagens-gta-vi\?utm_source=instagram&utm_medium=carousel&utm_campaign=post/);
  const tags = carousel.match(/#[\p{L}\p{N}_]+/gu) || [];
  assert.equal(tags.length, 5);
  assert.ok(tags.includes("#GTA6"));
  assert.equal(tags[0], "#GTA6");
  assert.ok(!tags.includes("#Carrossel"));
  assert.ok(tags.includes("#Gaming"));
  assert.ok(tags.includes("#Viral"));
  assert.doesNotMatch(carousel, /#Reels|#OrangeBrick/);
  assert.doesNotMatch(single, /#Instagram|#NoticiasDeGames|#Carrossel/);
});

test("descrições e origens são preenchidas usando os dados existentes, sem atribuir autoria", () => {
  const source = { ...post(), image_url: "https://project.supabase.co/storage/v1/object/public/images/capa.jpg", imageSources: { "https://project.supabase.co/storage/v1/object/public/images/capa.jpg": "https://www.rockstargames.com/VI/screenshots/cover.jpg" } };
  const draft = generateSocialDraft(source, "carousel");
  assert.match(draft.slides[0].caption, /Jason e Lucia/);
  assert.match(draft.slides[0].caption, /Origem: https:\/\/www.rockstargames.com/);
  assert.doesNotMatch(draft.slides[0].caption, /©|Crédito: Orange Brick|Fotógrafo/);
  assert.doesNotThrow(() => validateSocialDraft(draft, source));
});

test("rascunhos antigos recebem padrões sem sobrescrever textos manuais", () => {
  const source = post();
  const draft = generateSocialDraft(source, "carousel");
  draft.slides[0].caption = "";
  draft.caption = "Legenda que escrevi manualmente. #GTA6";
  draft.savedAt = "2026-11-05T10:00:00Z";
  const updated = applySocialDefaults(draft, source);
  assert.equal(updated.caption, draft.caption);
  assert.ok(updated.slides[0].caption.includes("Origem:"));
  assert.equal(updated.savedAt, null);
  assert.equal(applySocialDefaults(updated, source), updated);
  draft.slides[0].caption = "Crédito: fotógrafo identificado pelo editor.";
  assert.equal(applySocialDefaults(draft, source).slides[0].caption, draft.slides[0].caption);
  draft.caption = `${source.title}\n\n${source.summary}\n\nDeslize para entender. Curta e siga a Orange Brick para acompanhar mais notícias de games.\n\nMatéria: /posts/${source.slug}\nCréditos das imagens: consulte as legendas dos slides.\n\n#OrangeBrick`;
  assert.equal(applySocialDefaults(draft, source).caption, generateSocialCaption(source, "carousel"));
});

test("imagem armazenada sem origem registrada referencia a matéria, sem inventar um titular", () => {
  const source = { ...post(0), image_url: "https://project.supabase.co/storage/v1/object/public/images/capa.jpg", siteUrl: "https://orangebrick.blog" };
  const asset = socialPostAssets(source)[0];
  assert.match(asset.caption, /Origem: https:\/\/orangebrick.blog\/posts\//);
  assert.doesNotMatch(asset.caption, /Crédito:|©/);
});

test("biblioteca fornece a origem original da capa armazenada", async () => {
  const { enrichSocialPost } = await import("../src/lib/social/post-context.ts");
  const source = { ...post(0), image_url: "https://project.supabase.co/storage/v1/object/public/images/capa.jpg" };
  const db = { from: (table: string) => { assert.equal(table, "editorial_images"); return { select: () => ({ in: async () => ({ data: [{ public_url: source.image_url, source_url: "https://www.rockstargames.com/VI/cover.jpg" }], error: null }) }) }; } };
  const enriched = await enrichSocialPost(db as unknown as import("@supabase/supabase-js").SupabaseClient, source);
  assert.match(socialPostAssets(enriched)[0].caption, /Origem: https:\/\/www.rockstargames.com\/VI\/cover.jpg/);
});

test("hashtags do feed priorizam jogo e marca relacionada, sem tags editoriais", () => {
  for (const [title, summary, game, brand] of [
    ["God of War recebe novidades", "Kratos aparece no novo anúncio.", "GodOfWar", "PlayStation"],
    ["Halo ganha atualização", "A atualização chega ao Xbox.", "Halo", "Xbox"],
    ["Zelda recebe novidades", "A Nintendo mostrou o jogo no Switch 2.", "Zelda", "Nintendo"],
    ["Blue Prince chega ao PS5", "Blue Prince estreia no PlayStation.", "BluePrince", "PlayStation"],
  ]) {
    const caption = generateSocialCaption({ ...post(), title, summary, category: "breaking" }, "carousel");
    const tags: string[] = caption.match(/#[\p{L}\p{N}_]+/gu) || [];
    assert.equal(tags[0], `#${game}`);
    assert.ok(tags.includes(`#${brand}`));
    assert.equal(tags.length, 5);
    assert.equal(new Set(tags.map(tag => tag.toLowerCase())).size, 5);
    assert.ok(tags.includes("#Viral"));
    assert.doesNotMatch(tags.join(" "), /#Carrossel|#NoticiasDeGames|#Instagram/);
  }
  const pcOnly = generateSocialCaption({ ...post(), title: "Cyberpunk 2077 recebe novidades no PC", summary: "A atualização está na Steam.", category: "breaking" }, "single");
  assert.doesNotMatch(pcOnly, /#PlayStation|#Xbox|#Nintendo/);
  const existing = generateSocialDraft(post(), "carousel");
  existing.caption = "Texto editado manualmente.\n\n#GTA6 #NoticiasDeGames #Gaming #Carrossel #Viral";
  const migrated = applySocialDefaults(existing, post());
  assert.match(migrated.caption, /^Texto editado manualmente\./);
  assert.doesNotMatch(migrated.caption, /#Carrossel|#NoticiasDeGames/);
});

test("slide final mantém a pergunta e a legenda não repete a chamada", async () => {
  const { socialCommentCta } = await import("../src/lib/social/post-plan.ts");
  const source = post();
  const draft = generateSocialDraft(source, "carousel");
  const cta = socialCommentCta(generateSocialCaption(source, "carousel", true));
  assert.equal(draft.slides.at(-1)?.title, cta.title);
  assert.equal(draft.slides.at(-1)?.text, "Comenta aí.");
  assert.doesNotMatch(draft.caption, /Comenta a[ií]|Responda nos comentários/);
  const older = structuredClone(draft);
  older.caption += "\n\nComenta aí: qual imagem você escolheria?";
  older.slides[older.slides.length - 1].title = "Qual imagem você escolheria?";
  const cleaned = applySocialDefaults(older, source);
  assert.doesNotMatch(cleaned.caption, /Comenta a[ií]|qual imagem você escolheria/);
  assert.equal(cleaned.slides.at(-1)?.title, "Qual imagem você escolheria?");
  draft.slides[draft.slides.length - 1].title = "Curtiu? Deixa o like.";
  draft.slides[draft.slides.length - 1].text = "Segue a Orange Brick para acompanhar notícias de games com contexto.";
  const migrated = applySocialDefaults(draft, source);
  assert.equal(migrated.slides.at(-1)?.title, cta.title);
  draft.slides[draft.slides.length - 1].title = "Uma chamada que o editor escreveu.";
  assert.equal(applySocialDefaults(draft, source).slides.at(-1)?.title, "Uma chamada que o editor escreveu.");
  assert.equal(socialCommentCta("Responda nos comentários: Qual imagem você escolheria?").title, "Qual imagem você escolheria?");
});


test("resumos escolhem frases completas dentro do espaço e nunca cortam a informação", () => {
  const lead = "O jogo chega em 20 de maio de 2027 para PS5.";
  const detail = "O estúdio usará o tempo extra para finalizar o desenvolvimento.";
  const source = `${lead} ${"Detalhes complementares ".repeat(25)}. ${detail}`;
  assert.equal(summarizeSocialText(source, 180), `${lead} ${detail}`);
  assert.equal(summarizeSocialText(`${lead} ${detail}`, lead.length), lead);
  assert.throws(() => summarizeSocialText("Uma frase muito longa ".repeat(30) + "."), /frase completa/);
  assert.throws(() => summarizeSocialText("O anúncio ainda não terminou…"), /frase completa/);
});

test("rascunhos com cortes automáticos são recuperados sem sobrescrever resumos manuais", () => {
  const source = post();
  const content = "O jogo chega em maio. O desenvolvimento terá mais tempo para os ajustes finais. " + "Informação complementar confirmada pelo estúdio. ".repeat(10);
  source.body = JSON.stringify([{ id: "intro", type: "text", content }]);
  const draft = generateSocialDraft(source, "carousel");
  draft.slides[1].text = content.trim().slice(0, 299).replace(/\s+\S*$/, "") + "…";
  const migrated = applySocialDefaults(draft, source);
  assert.ok(migrated.slides[1].text.endsWith("."));
  assert.ok(migrated.slides[1].text.length <= 300);
  assert.ok(migrated.slides[1].text.startsWith("O jogo chega em maio."));
  assert.doesNotThrow(() => validateSocialDraft(migrated, source));
  const manual = structuredClone(draft);
  manual.slides[1].text = "O lançamento será em maio. A equipe vai concluir os ajustes.";
  assert.equal(applySocialDefaults(manual, source).slides[1].text, manual.slides[1].text);
  manual.slides[1].text = "O jogo será lançado mas…";
  assert.throws(() => validateSocialDraft(manual, source), /Conclua o resumo/);
});

test("carrossel limita palavras por slide e abre o slide 2 como segunda capa", () => {
  const source = post(2);
  source.title = "Sony confirma que o PS5 passou de 100 milhões";
  source.summary = "O PS5 chegou a 100 milhões de consoles distribuídos. A marca coloca o console perto do PS4.";
  const long = "A Sony informou o número no relatório trimestral divulgado nesta semana. " + "O resultado inclui todas as versões do console vendidas nas lojas. ".repeat(8);
  source.body = JSON.stringify([{ id: "intro", type: "text", content: long }, { id: "i0", type: "image", url: "https://official.test/0.jpg", alt: "Console PS5 em foto oficial da Sony.", caption: "PS5. Crédito: Sony." }, { id: "t1", type: "text", content: "## Contexto\n" + long }]);
  const draft = generateSocialDraft(source, "carousel");
  assert.equal(draft.slides[0].text, "");
  assert.ok(socialWordCount(draft.slides[0].title + " " + draft.slides[0].text) <= SOCIAL_COVER_WORDS);
  assert.equal(draft.slides[1].title, "O PS5 chegou a 100 milhões de consoles distribuídos");
  assert.ok(draft.slides.filter(slide => slide.kind === "content").every(slide => socialWordCount(`${slide.title} ${slide.text}`) <= SOCIAL_SLIDE_WORDS));
  assert.equal(new Set(draft.slides.map(slide => slide.id)).size, draft.slides.length);
  assert.doesNotThrow(() => validateSocialDraft(draft, source));
  const single = generateSocialDraft(source, "single");
  assert.ok(socialWordCount(`${single.slides[0].title} ${single.slides[0].text}`) <= SOCIAL_COVER_WORDS);
});

test("slide 2 usa a manchete quando o resumo começa como continuação ou é longo demais", () => {
  const source = post(1);
  source.summary = "Mas o anúncio só vale para o Japão e deixa de fora as outras regiões onde o console é vendido hoje.";
  assert.equal(generateSocialDraft(source, "carousel").slides[1].title, source.title);
});

test("textos gerados no formato antigo são resumidos de novo no limite atual", () => {
  const source = post(1);
  const content = "O jogo chega em maio para PS5 e Xbox Series X|S. " + "O estúdio confirmou mais detalhes da versão final no comunicado oficial. ".repeat(4);
  source.body = JSON.stringify([{ id: "intro", type: "text", content }]);
  const draft = generateSocialDraft(source, "carousel");
  draft.slides[0].text = summarizeSocialText(source.summary, 200);
  draft.slides[1].text = summarizeSocialText(content, 300);
  const migrated = applySocialDefaults(draft, source);
  assert.equal(migrated.slides[0].text, "");
  assert.ok(socialWordCount(`${migrated.slides[1].title} ${migrated.slides[1].text}`) <= SOCIAL_SLIDE_WORDS);
  assert.ok(migrated.slides[1].text.startsWith("O jogo chega em maio"));
});

test("a verificação aponta pedidos de ação no meio, vícios de texto, excesso de palavras e slide 2 dependente", async () => {
  const { socialDraftQualityIssues, assertSocialDraftQuality } = await import("../src/lib/social/post-plan.ts");
  const source = post(2);
  const draft = generateSocialDraft(source, "carousel");
  assert.deepEqual(socialDraftQualityIssues(draft), []);
  assert.doesNotThrow(() => assertSocialDraftQuality(draft));
  const broken = structuredClone(draft);
  broken.slides[1].title = "Mas a Rockstar ainda não confirmou";
  broken.slides[2].text = "Comenta aí o que você achou. Não é só um trailer. É uma virada revolucionária — e tem mais...";
  broken.slides[0].title = "Uma capa com palavras demais ".repeat(5).trim();
  const issues = socialDraftQualityIssues(broken);
  for (const pattern of [/Slide 1: a capa tem/, /Slide 2: ele precisa se explicar/, /Slide 3: o pedido de ação/, /Slide 3: remova travessão/, /Slide 3: remova reticências/, /Slide 3: remova a fórmula/, /Slide 3: remova clichê/]) assert.ok(issues.some(issue => pattern.test(issue)), String(pattern));
  assert.throws(() => assertSocialDraftQuality(broken), /Revise antes de publicar/);
  assert.equal(socialDraftQualityIssues(draft).length, 0);
  assert.ok(!socialDraftQualityIssues({ ...draft, slides: draft.slides.map(slide => slide.kind === "cta" ? { ...slide, text: "Comenta aí." } : slide) }).length);
});

test("o gerador troca travessões por vírgulas para o carrossel passar na revisão", () => {
  const post = { id: "00000000-0000-4000-8000-000000000009", slug: "laufey", title: "God of War — Laufey é adiado", summary: "A Santa Monica adiou o jogo — e explicou o motivo.", image_url: "https://official.test/c.jpg", image_alt: "Arte oficial de Laufey.", updated_at: "2026-11-05T12:00:00Z", information_status: "confirmed", body: JSON.stringify([{ id: "t", type: "text", content: "O estúdio confirmou a mudança — sem nova data — durante a transmissão." }]) } as SocialSourcePost;
  const draft = generateSocialDraft(post, "carousel");
  const text = draft.slides.map(slide => `${slide.title} ${slide.text}`).join(" ");
  assert.equal(text.includes("—"), false);
  assert.equal(draft.slides[0].title, "God of War: Laufey é adiado");
  assert.match(text, /O estúdio confirmou a mudança, sem nova data, durante a transmissão\./);
  assert.equal(socialDraftQualityIssues(draft).some(issue => /travessão/.test(issue)), false);
  const saved = { ...draft, slides: draft.slides.map(slide => slide.text.startsWith("O estúdio") ? { ...slide, text: "O estúdio confirmou a mudança — sem nova data — durante a transmissão." } : slide) };
  assert.equal(applySocialDefaults(saved, post).slides.some(slide => slide.text.includes("—")), false);
});
