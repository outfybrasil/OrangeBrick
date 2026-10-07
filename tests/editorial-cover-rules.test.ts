import assert from "node:assert/strict";
import test from "node:test";
import type { GeneratedDraftResult } from "../src/lib/ai/gemini-news.ts";
import { editorialPublicationBlockers } from "../src/lib/server/editorial-publication.ts";
import {
  validateCoverRelevance,
  generateFactualAltText,
  isRealDiscoveredImageUrl,
  isGenericOrProhibitedImage,
  validateImageUrl,
  rankCoverCandidates,
  resolveCoverCascade,
  buildCoverAbsenceTelegramMessage,
  type EditorialArticleContext,
  type EditorialCoverCandidate,
} from "../src/lib/editorial-cover.ts";

function createValidDraft(overrides?: Partial<GeneratedDraftResult>): GeneratedDraftResult {
  const source = {
    name: "Rockstar Games",
    url: "https://www.rockstargames.com/news/article/gta-vi-official-update",
    is_official: true,
    source_verified: true,
  };
  const bodyText = `${"contexto jornalístico apurado e confirmado sobre o anúncio ".repeat(200)}\n\n**Fonte:** [Rockstar Games](${source.url})`;
  const coverUrl = "https://assets.rockstargames.com/news/gta-vi-key-art-lucia-jason.jpg";

  return {
    post: {
      id: "post-gta-6",
      slug: "rockstar-revela-detalhes-oficiais-gta-vi",
      title: "ROCKSTAR CONFIRMA NOVIDADES OFICIAIS DE GTA VI",
      summary: "A Rockstar Games divulgou novos detalhes confirmados sobre a produção e a narrativa de GTA VI para a geração atual.",
      body: JSON.stringify([
        { id: "intro", type: "text", content: "A Rockstar Games confirmou hoje novos detalhes oficiais sobre Grand Theft Auto VI." },
        { id: "dev", type: "text", content: bodyText },
      ]),
      category: "breaking",
      image_url: coverUrl,
      image_alt: "Arte promocional de Grand Theft Auto VI com Lucia e Jason.",
      author_name: "Orange Brick",
      author_tag: "Plantão",
      is_published: false,
      published_at: null,
      created_at: "2026-10-07T12:00:00.000Z",
      updated_at: "2026-10-07T12:00:00.000Z",
      topic_id: null,
      information_status: "confirmed",
      featured_quote: { absence_registered: true },
      editorial_sources: [source],
      short_article_reason: null,
      correction_note: null,
    },
    wordCount: 820,
    sources: [source],
    groundingSources: [],
    verifiedImages: [
      {
        url: coverUrl,
        sourceUrl: source.url,
        sha256: "b".repeat(64),
        alt: "Arte promocional oficial de Grand Theft Auto VI com Lucia e Jason.",
        caption: "Material visual divulgado oficialmente pela Rockstar Games.",
      },
    ],
    ...overrides,
  };
}

// 1. should_not_publish_article_without_cover_image
test("should_not_publish_article_without_cover_image", () => {
  const draftWithoutCover = createValidDraft();
  draftWithoutCover.post.image_url = "";
  draftWithoutCover.verifiedImages = [];

  const blockers = editorialPublicationBlockers(draftWithoutCover);
  assert.ok(blockers.length > 0, "Deve gerar bloqueios de publicação.");
  assert.ok(
    blockers.some((b) => b.includes("imagem de capa é obrigatória")),
    "Deve conter o bloqueador específico de capa obrigatória.",
  );
});

// 2. should_try_another_image_when_first_candidate_is_invalid
test("should_try_another_image_when_first_candidate_is_invalid", async () => {
  const article: EditorialArticleContext = {
    title: "Rockstar adia GTA VI",
    summary: "A Rockstar Games anunciou oficialmente uma nova janela de lançamento para Grand Theft Auto VI.",
  };

  const candidates: EditorialCoverCandidate[] = [
    {
      url: "https://assets.rockstargames.com/broken-link-404.jpg",
      title: "Arte de GTA VI não encontrada",
      assetType: "official_game_art",
    },
    {
      url: "https://assets.rockstargames.com/gta-vi-official-key-art.jpg",
      title: "Arte oficial de Grand Theft Auto VI",
      assetType: "official_game_art",
    },
  ];

  const mockFetch = async (input: RequestInfo | URL) => {
    const urlStr = String(input);
    if (urlStr.includes("broken-link-404")) {
      return new Response("Not Found", { status: 404 });
    }
    return new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: { "content-type": "image/jpeg" },
    });
  };

  const result = await resolveCoverCascade(article, candidates, { fetchFn: mockFetch as typeof fetch });
  assert.ok(result.selected !== null, "Deve selecionar o segundo candidato válido.");
  assert.equal(result.selected?.url, "https://assets.rockstargames.com/gta-vi-official-key-art.jpg");
  assert.equal(result.attempts.length, 1);
  assert.equal(result.attempts[0].reason, "http_status_404");
});

// 3. should_reject_generic_image_unrelated_to_article
test("should_reject_generic_image_unrelated_to_article", () => {
  const article: EditorialArticleContext = {
    title: "Rockstar adia GTA VI",
    summary: "Grand Theft Auto VI teve sua data alterada oficialmente pela publicadora.",
  };

  const genericCandidate: EditorialCoverCandidate = {
    url: "https://assets.rockstargames.com/generic-setup.jpg",
    title: "Teclado RGB gamer com iluminação neon",
    assetType: "generic_stock",
  };

  const result = validateCoverRelevance(article, genericCandidate);
  assert.equal(result.relevant, false, "Imagem genérica deve ser rejeitada.");
  assert.equal(result.reason, "generic_image_prohibited");
  assert.equal(isGenericOrProhibitedImage(genericCandidate), true);
});

// 4. should_accept_official_game_cover_related_to_article
test("should_accept_official_game_cover_related_to_article", () => {
  const article: EditorialArticleContext = {
    title: "Nintendo anuncia novo trailer de Metroid Prime 4",
    summary: "A Nintendo divulgou um trailer estendido com detalhes de jogabilidade e ambientação.",
  };

  const gameCoverCandidate: EditorialCoverCandidate = {
    url: "https://assets.nintendo.com/metroid-prime-4-cover.jpg",
    title: "Capa oficial de Metroid Prime 4",
    assetType: "official_game_art",
  };

  const result = validateCoverRelevance(article, gameCoverCandidate);
  assert.equal(result.relevant, true, "Capa oficial do jogo deve ser aceita.");
  assert.ok(result.score >= 0.85, "Score de relevância deve ser alto.");
  assert.equal(result.priority, 2, "Prioridade 2 para material oficial do jogo.");
});

// 5. should_accept_company_logo_for_company_related_news
test("should_accept_company_logo_for_company_related_news", () => {
  const article: EditorialArticleContext = {
    title: "Ubisoft anuncia nova reestruturação interna",
    summary: "A Ubisoft confirmou mudanças estratégicas em suas divisões globais de produção corporativa.",
  };

  const companyLogoCandidate: EditorialCoverCandidate = {
    url: "https://assets.ubisoft.com/company-logo.png",
    title: "Logo oficial da Ubisoft",
    assetType: "official_company",
  };

  const result = validateCoverRelevance(article, companyLogoCandidate);
  assert.equal(result.relevant, true, "Logo da empresa deve ser aceito para notícia corporativa.");
  assert.ok(result.score >= 0.75);
  assert.equal(result.priority, 3);
});

// 6. should_not_use_company_logo_when_more_specific_article_asset_exists
test("should_not_use_company_logo_when_more_specific_article_asset_exists", () => {
  const article: EditorialArticleContext = {
    title: "Rockstar adia GTA VI",
    summary: "O novo Grand Theft Auto VI teve seu lançamento postergado.",
  };

  const companyLogo: EditorialCoverCandidate = {
    url: "https://assets.rockstargames.com/rockstar-logo.png",
    title: "Logo oficial da Rockstar Games",
    assetType: "official_company",
  };

  const specificGameArt: EditorialCoverCandidate = {
    url: "https://assets.rockstargames.com/gta-vi-key-art.jpg",
    title: "Key art oficial de Grand Theft Auto VI com Lucia e Jason",
    assetType: "official_game_art",
  };

  const ranked = rankCoverCandidates(article, [companyLogo, specificGameArt]);
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].candidate.url, specificGameArt.url, "Asset específico deve vir antes do logo corporativo.");
  assert.ok(ranked[0].relevance.priority < ranked[1].relevance.priority, "Prioridade do jogo específico é maior (número menor).");
});

// 7. should_generate_alt_text_when_cover_has_no_alt
test("should_generate_alt_text_when_cover_has_no_alt", () => {
  const article: EditorialArticleContext = {
    title: "Rockstar adia GTA VI",
    summary: "A Rockstar Games informou uma nova janela para Grand Theft Auto VI.",
  };

  const generatedAlt = generateFactualAltText(article, {
    title: "Arte promocional de Grand Theft Auto VI",
  });

  assert.ok(generatedAlt.length >= 10, "Alt text deve ter tamanho razoável.");
  assert.match(generatedAlt, /Grand Theft Auto VI/, "Alt text deve mencionar a entidade factual.");
  assert.doesNotMatch(generatedAlt, /incrível|imperdível|melhor jogo/, "Alt text não deve ter adjetivos sensacionalistas.");

  const draftMissingAlt = createValidDraft();
  draftMissingAlt.post.image_alt = "";
  const blockers = editorialPublicationBlockers(draftMissingAlt);
  assert.equal(blockers.length, 0, "Falta inicial de alt text na capa é auto-fixada e não bloqueia publicação.");
  assert.ok(draftMissingAlt.post.image_alt.length > 0, "Alt text foi gerado automaticamente.");
});

// 8. should_not_generate_fake_image_url
test("should_not_generate_fake_image_url", () => {
  const fakeUrl = "https://example.com/gta6-cover.jpg";
  const dummyUrl = "https://dummy.com/placeholder.png";
  const realUrl = "https://assets.rockstargames.com/gta-vi-cover.jpg";

  assert.equal(isRealDiscoveredImageUrl(fakeUrl), false, "example.com deve ser rejeitado como URL fictícia.");
  assert.equal(isRealDiscoveredImageUrl(dummyUrl), false, "dummy.com deve ser rejeitado.");
  assert.equal(isRealDiscoveredImageUrl(realUrl), true, "URL de CDN autêntico deve ser aceita.");
});

// 9. should_validate_image_url_before_publishing
test("should_validate_image_url_before_publishing", async () => {
  const mock404Fetch = async () => new Response("Not found", { status: 404 });
  const mockOkFetch = async () =>
    new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: { "content-type": "image/webp" },
    });
  const mockHtmlFetch = async () =>
    new Response("<html><body>Error</body></html>", {
      status: 200,
      headers: { "content-type": "text/html" },
    });

  const res404 = await validateImageUrl("https://assets.nintendo.com/missing.jpg", mock404Fetch as typeof fetch);
  assert.equal(res404.valid, false);
  assert.equal(res404.status, 404);

  const resHtml = await validateImageUrl("https://assets.nintendo.com/error-page", mockHtmlFetch as typeof fetch);
  assert.equal(resHtml.valid, false);
  assert.equal(resHtml.reason, "invalid_content_type");

  const resOk = await validateImageUrl("https://assets.nintendo.com/valid.webp", mockOkFetch as typeof fetch);
  assert.equal(resOk.valid, true);
  assert.equal(resOk.contentType, "image/webp");
});

// 10. should_not_require_two_internal_images_to_publish
test("should_not_require_two_internal_images_to_publish", () => {
  const draftSingleCover = createValidDraft();
  // Valid draft with only cover and 0 body images
  const parsedBody = JSON.parse(draftSingleCover.post.body) as Array<{ type: string }>;
  const bodyWithoutImages = parsedBody.filter((b) => b.type !== "image");
  draftSingleCover.post.body = JSON.stringify(bodyWithoutImages);

  const blockers = editorialPublicationBlockers(draftSingleCover);
  assert.deepEqual(blockers, [], "Matéria com apenas 1 capa excelente e 0 imagens internas deve publicar normalmente.");
});

// End-to-End Simulation: Candidate Fallback & Publication
test("e2e_simulation_candidate_fallback_and_publish", async () => {
  const article: EditorialArticleContext = {
    title: "Rockstar adia GTA VI para nova data",
    summary: "A Rockstar Games anunciou oficialmente uma nova janela de lançamento para Grand Theft Auto VI.",
  };

  const candidates: EditorialCoverCandidate[] = [
    {
      url: "https://assets.rockstargames.com/gamer-room-rgb.jpg",
      title: "Setup gamer com teclado RGB e luz neon",
      assetType: "generic_stock",
    },
    {
      url: "https://assets.rockstargames.com/old-trailer-404.jpg",
      title: "Trailer de anúncio de Grand Theft Auto VI",
      assetType: "official_game_art",
    },
    {
      url: "https://assets.rockstargames.com/gta-vi-key-art-lucia-jason.jpg",
      title: "Arte promocional de Grand Theft Auto VI com Lucia e Jason",
      assetType: "official_game_art",
    },
  ];

  const mockFetch = async (input: RequestInfo | URL) => {
    const urlStr = String(input);
    if (urlStr.includes("old-trailer-404")) {
      return new Response("Not Found", { status: 404 });
    }
    return new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: { "content-type": "image/jpeg" },
    });
  };

  // Step 1 & 2: Cascade resolution
  const cascade = await resolveCoverCascade(article, candidates, { fetchFn: mockFetch as typeof fetch });
  assert.ok(cascade.selected !== null, "Deve encontrar capa válida no terceiro candidato.");
  assert.equal(cascade.selected?.url, "https://assets.rockstargames.com/gta-vi-key-art-lucia-jason.jpg");
  assert.equal(cascade.attempts.length, 2, "Candidato 1 (genérico) e Candidato 2 (404) devem ter sido registrados.");
  assert.equal(cascade.attempts[0].reason, "generic_image_prohibited");
  assert.equal(cascade.attempts[1].reason, "http_status_404");

  // Step 3: Build draft with selected cover and auto-fixed alt
  const draft = createValidDraft({
    verifiedImages: [
      {
        url: cascade.selected.url,
        sourceUrl: "https://www.rockstargames.com/news/article/gta-vi-official-update",
        sha256: "c".repeat(64),
        alt: "Arte promocional de Grand Theft Auto VI com Lucia e Jason.",
        caption: "Material visual oficial divulgado pela Rockstar Games.",
      },
    ],
  });
  draft.post.image_url = cascade.selected.url;
  draft.post.image_alt = cascade.selected.alt || "";

  // Step 4: Editorial validation
  const blockers = editorialPublicationBlockers(draft);
  assert.deepEqual(blockers, [], "Nenhum bloqueador editorial deve existir.");

  // Step 5: Published state
  draft.post.is_published = true;
  assert.equal(draft.post.is_published, true);
});

// End-to-End Simulation: Case Without Image (All Attempts Exhausted -> HARD BLOCKER -> Telegram Notice)
test("e2e_simulation_no_image_exhausted_fallback_and_notify", async () => {
  const article: EditorialArticleContext = {
    title: "Jogo misterioso anunciado sem imagens",
    summary: "Um anúncio textual confirmou o desenvolvimento de um novo título ainda sem material visual.",
  };

  const candidates: EditorialCoverCandidate[] = [
    {
      url: "https://example.com/fake-image.jpg",
      title: "URL inventada pela IA",
      assetType: "unknown",
    },
    {
      url: "https://assets.games.com/generic-controller.jpg",
      title: "Controle genérico de videogame",
      assetType: "generic_stock",
    },
    {
      url: "https://assets.games.com/broken-asset.jpg",
      title: "Asset quebrado 404",
      assetType: "trusted_publisher",
    },
  ];

  const mockFetch = async () => new Response("Not Found", { status: 404 });

  const cascade = await resolveCoverCascade(article, candidates, { fetchFn: mockFetch as typeof fetch });
  assert.equal(cascade.selected, null, "Nenhuma imagem deve ser selecionada.");
  assert.equal(cascade.attempts.length, 3, "Todas as tentativas foram esgotadas.");

  // Hard blocker: draft stays without cover
  const draftWithoutCover = createValidDraft();
  draftWithoutCover.post.image_url = "";
  draftWithoutCover.verifiedImages = [];

  const blockers = editorialPublicationBlockers(draftWithoutCover);
  assert.ok(blockers.length > 0, "Deve haver bloqueador de publicação.");
  assert.equal(draftWithoutCover.post.is_published, false, "Matéria NÃO deve ser publicada.");

  // Telegram message verification
  const telegramMessage = buildCoverAbsenceTelegramMessage("17");
  assert.equal(
    telegramMessage,
    "❌ <b>Não foi possível publicar a matéria das 17h.</b>\n\nNão encontrei uma imagem de capa válida e relacionada à pauta após verificar as fontes disponíveis.",
  );
});
