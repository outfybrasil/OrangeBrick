export interface EditorialArticleContext {
  title: string;
  summary: string;
  subject?: string;
  category?: string;
  game?: string;
  company?: string;
  hardware?: string;
  event?: string;
  body?: string;
  sources?: Array<{ name: string; url: string; is_official?: boolean }>;
}

export type CoverAssetType =
  | "official_announcement"
  | "official_game_art"
  | "official_company"
  | "source_article"
  | "trusted_publisher"
  | "generic_stock"
  | "ai_generated"
  | "unknown";

export interface EditorialCoverCandidate {
  url: string;
  sourceUrl?: string;
  discoveredFrom?: string;
  title?: string;
  alt?: string;
  caption?: string;
  assetType?: CoverAssetType;
  isGeneric?: boolean;
  sha256?: string;
}

export interface CoverRelevanceScore {
  relevant: boolean;
  score: number;
  priority: number;
  reason?: string;
}

export interface UrlValidationResult {
  valid: boolean;
  status?: number;
  contentType?: string;
  reason?: string;
}

const PROHIBITED_GENERIC_PATTERNS = [
  /\b(?:controle|joystick|gamepad)\s+(?:generico|aleatorio|sem\s+marca)\b/i,
  /\bgeneric\s+(?:controller|gamepad|joystick)\b/i,
  /\bteclado\s+rgb\b/i,
  /\brgb\s+keyboard\b/i,
  /\bsetup\s+gamer\b/i,
  /\bgaming\s+setup\b/i,
  /\bpessoa\s+jogando(?:\s+videogame)?\b/i,
  /\b(?:gamer|person)\s+playing\b/i,
  /\bmonitor\s+com\s+jogo\s+indistinguivel\b/i,
  /\bluz\s+neon\b/i,
  /\bneon\s+lights?\b/i,
  /\bstock\s+gamer\b/i,
  /\bbanco\s+de\s+imagens\s+gamer\b/i,
  /\bimagem\s+abstrata\b/i,
  /\babstract\s+gaming\b/i,
  /\bimagem\s+criada\s+apenas\s+para\s+preencher\s+espaco\b/i,
  /\bplaceholder\b/i,
  /\bscreenshot\s+de\s+outro\s+jogo\b/i,
  /\bunrelated\s+game\b/i,
  /\bai\s+generic\b/i,
];

const DISALLOWED_FAKE_HOSTS = new Set([
  "example.com",
  "example.org",
  "example.net",
  "fake.com",
  "placeholder.com",
  "dummy.com",
  "test.com",
  "localhost",
]);

function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isGenericOrProhibitedImage(candidate: EditorialCoverCandidate | string): boolean {
  if (typeof candidate === "string") {
    return PROHIBITED_GENERIC_PATTERNS.some((pattern) => pattern.test(candidate));
  }

  if (candidate.isGeneric === true || candidate.assetType === "generic_stock") {
    return true;
  }

  const combinedText = [
    candidate.title || "",
    candidate.alt || "",
    candidate.caption || "",
    candidate.url || "",
  ].join(" ");

  return PROHIBITED_GENERIC_PATTERNS.some((pattern) => pattern.test(combinedText));
}

export function isRealDiscoveredImageUrl(url: string, trustedOrigins?: Iterable<string>): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && !url.startsWith("/")) return false;
    if (DISALLOWED_FAKE_HOSTS.has(parsed.hostname.toLowerCase())) return false;
    if (parsed.hostname.endsWith(".example.com")) return false;

    if (trustedOrigins) {
      const originsArray = Array.from(trustedOrigins);
      if (originsArray.length > 0) {
        const matchesOrigin = originsArray.some((origin) => {
          try {
            if (origin === url) return true;
            const originParsed = new URL(origin);
            return (
              parsed.hostname === originParsed.hostname ||
              parsed.hostname.endsWith(`.${originParsed.hostname}`)
            );
          } catch {
            return false;
          }
        });
        if (!matchesOrigin) return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

export function extractEntities(article: EditorialArticleContext): {
  game?: string;
  gameAliases?: string[];
  company?: string;
  hardware?: string;
  hardwareAliases?: string[];
  event?: string;
} {
  const normTitle = normalizeText(article.title);
  const normSummary = normalizeText(article.summary);
  const fullText = `${normTitle} ${normSummary}`;

  let game = article.game;
  let gameAliases: string[] = [];
  if (!game) {
    if (/\bgta\s+vi\b|\bgrand\s+theft\s+auto\s+vi\b/.test(fullText)) {
      game = "Grand Theft Auto VI";
      gameAliases = ["grand theft auto vi", "gta vi", "gta 6", "lucia", "jason"];
    } else if (/\bmetroid\s+prime\s+4\b/.test(fullText)) {
      game = "Metroid Prime 4";
      gameAliases = ["metroid prime 4", "metroid prime", "metroid"];
    } else if (/\bgod\s+of\s+war\s+ragnarok\b/.test(fullText)) {
      game = "God of War Ragnarök";
      gameAliases = ["god of war ragnarok", "god of war"];
    } else if (/\bwolverine\b/.test(fullText)) {
      game = "Marvel's Wolverine";
      gameAliases = ["marvel s wolverine", "wolverine"];
    } else if (/\bstarfield\b/.test(fullText)) {
      game = "Starfield";
      gameAliases = ["starfield"];
    }
  } else {
    gameAliases = [normalizeText(game)];
    if (/gta\s*vi|grand\s*theft\s*auto\s*vi/i.test(game)) {
      gameAliases.push("gta vi", "grand theft auto vi", "gta 6");
    }
  }

  let company = article.company;
  if (!company) {
    if (/\brockstar(?:\s+games)?\b/.test(fullText)) company = "Rockstar Games";
    else if (/\bnintendo\b/.test(fullText)) company = "Nintendo";
    else if (/\bubisoft\b/.test(fullText)) company = "Ubisoft";
    else if (/\bsony\b|\bplaystation\b/.test(fullText)) company = "Sony";
    else if (/\bxbox\b|\bmicrosoft\b/.test(fullText)) company = "Microsoft";
    else if (/\bcapcom\b/.test(fullText)) company = "Capcom";
    else if (/\bea\b|\belectronic\s+arts\b/.test(fullText)) company = "Electronic Arts";
  }

  let hardware = article.hardware;
  let hardwareAliases: string[] = [];
  if (!hardware) {
    if (/\bplaystation\s+5\b|\bps5\b/.test(fullText)) {
      hardware = "PlayStation 5";
      hardwareAliases = ["playstation 5", "ps5"];
    } else if (/\bswitch\s+2\b|\bnintendo\s+switch\b/.test(fullText)) {
      hardware = "Nintendo Switch";
      hardwareAliases = ["nintendo switch", "switch", "switch 2"];
    } else if (/\bxbox\s+series\b/.test(fullText)) {
      hardware = "Xbox Series";
      hardwareAliases = ["xbox series", "xbox series x", "xbox series s"];
    } else if (/\bsteam\s+deck\b/.test(fullText)) {
      hardware = "Steam Deck";
      hardwareAliases = ["steam deck"];
    }
  }

  let event = article.event;
  if (!event) {
    if (/\bgamescom\b/.test(fullText)) event = "Gamescom";
    else if (/\btokyo\s+game\s+show\b|\btgs\b/.test(fullText)) event = "Tokyo Game Show";
    else if (/\bstate\s+of\s+play\b/.test(fullText)) event = "State of Play";
    else if (/\bnintendo\s+direct\b/.test(fullText)) event = "Nintendo Direct";
    else if (/\bthe\s+game\s+awards\b|\btga\b/.test(fullText)) event = "The Game Awards";
  }

  return { game, gameAliases, company, hardware, hardwareAliases, event };
}

export function validateCoverRelevance(
  article: EditorialArticleContext,
  candidate: EditorialCoverCandidate,
): CoverRelevanceScore {
  if (isGenericOrProhibitedImage(candidate)) {
    return { relevant: false, score: 0, priority: 99, reason: "generic_image_prohibited" };
  }

  if (candidate.assetType === "ai_generated") {
    return { relevant: false, score: 0, priority: 99, reason: "ai_generated_image_prohibited" };
  }

  const { game, gameAliases, company, hardware, hardwareAliases, event } = extractEntities(article);
  const candText = normalizeText(
    [candidate.title || "", candidate.alt || "", candidate.caption || "", candidate.url || ""].join(" "),
  );
  const normTitle = normalizeText(article.title);

  const isCompanyCentricNews =
    Boolean(company) &&
    !game &&
    (/\breestruturacao\b|\bfinanceiro\b|\baquisicao\b|\bcompra\b|\bdemiss\b|\blucro\b|\brelatorio\b|\bprocesso\b|\bcomunicado\b/.test(
      normTitle,
    ) ||
      !hardware);

  const mentionsSpecificGame = Boolean(
    game && (
      candText.includes(normalizeText(game)) ||
      (gameAliases && gameAliases.some((alias) => candText.includes(alias)))
    ),
  );
  const mentionsSpecificHardware = Boolean(
    hardware && (
      candText.includes(normalizeText(hardware)) ||
      (hardwareAliases && hardwareAliases.some((alias) => candText.includes(alias)))
    ),
  );
  const mentionsSpecificCompany = Boolean(company && candText.includes(normalizeText(company)));
  const mentionsSpecificEvent = Boolean(event && candText.includes(normalizeText(event)));

  if (
    !mentionsSpecificGame &&
    /\bgod\s+of\s+war\b|\bfortnite\b|\bminecraft\b|\bzelda\b|\bhalo\b/.test(candText) &&
    !normTitle.includes("god of war") &&
    !normTitle.includes("fortnite") &&
    !normTitle.includes("zelda") &&
    !normTitle.includes("halo")
  ) {
    return { relevant: false, score: 0.35, priority: 5, reason: "unrelated_game_image" };
  }

  if (candidate.assetType === "official_announcement") {
    if (mentionsSpecificGame || mentionsSpecificHardware || mentionsSpecificEvent || mentionsSpecificCompany) {
      return { relevant: true, score: 0.98, priority: 1, reason: "official_announcement_asset" };
    }
  }

  if (mentionsSpecificGame) {
    if (candidate.assetType === "official_game_art" || /\bcapa\b|\bkey\s+art\b|\bscreenshot\b|\barte\b/.test(candText)) {
      return { relevant: true, score: 0.94, priority: 2, reason: "official_game_art" };
    }
    return { relevant: true, score: 0.88, priority: 2, reason: "game_related_asset" };
  }

  if (mentionsSpecificHardware) {
    return { relevant: true, score: 0.95, priority: 1, reason: "official_hardware_asset" };
  }

  if (mentionsSpecificEvent) {
    return { relevant: true, score: 0.92, priority: 1, reason: "official_event_asset" };
  }

  if (mentionsSpecificCompany) {
    if (candidate.assetType === "official_company" || /\blogo\b|\bsede\b|\bexecutiv\b/.test(candText)) {
      if (isCompanyCentricNews) {
        return { relevant: true, score: 0.88, priority: 3, reason: "official_company_asset_for_company_news" };
      }
      return { relevant: true, score: 0.72, priority: 3, reason: "company_logo_fallback" };
    }
    return { relevant: true, score: 0.7, priority: 3, reason: "company_related_asset" };
  }

  if (candidate.assetType === "source_article") {
    return { relevant: true, score: 0.65, priority: 4, reason: "source_article_image" };
  }

  if (candidate.assetType === "trusted_publisher") {
    return { relevant: true, score: 0.55, priority: 5, reason: "trusted_publisher_image" };
  }

  const titleWords = normTitle.split(" ").filter((w) => w.length >= 4);
  const matchedWords = titleWords.filter((w) => candText.includes(w));
  if (matchedWords.length >= 2) {
    return { relevant: true, score: 0.6, priority: 4, reason: "keyword_matched_asset" };
  }

  return { relevant: false, score: 0.3, priority: 5, reason: "insufficient_relevance" };
}

export function generateFactualAltText(
  article: Pick<EditorialArticleContext, "title" | "summary" | "subject" | "game" | "company">,
  candidate?: Partial<EditorialCoverCandidate>,
): string {
  const { game, company } = extractEntities(article);

  if (candidate?.title && !isGenericOrProhibitedImage(candidate.title)) {
    const cleanTitle = candidate.title.replace(/\s*\(.*?\)/g, "").trim();
    if (cleanTitle.length >= 10 && cleanTitle.length <= 120) {
      return `${cleanTitle}.`;
    }
  }

  if (game) {
    return `Arte oficial promocional de ${game} relacionada ao anúncio.`;
  }

  if (company) {
    return `Material oficial de divulgação da ${company}.`;
  }

  const cleanTitle = article.title.replace(/^[A-Z0-9\s—:-]+:\s*/, "").trim();
  return `Material visual oficial relacionado à notícia: ${cleanTitle}.`;
}

export async function validateImageUrl(
  url: string,
  fetchFn: typeof fetch = fetch,
): Promise<UrlValidationResult> {
  if (!url || typeof url !== "string") {
    return { valid: false, reason: "empty_url" };
  }

  if (url.startsWith("/")) {
    return { valid: true, status: 200, contentType: "image/jpeg" };
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      return { valid: false, reason: "non_https_url" };
    }
    if (DISALLOWED_FAKE_HOSTS.has(parsed.hostname.toLowerCase())) {
      return { valid: false, reason: "fake_disallowed_host" };
    }
  } catch {
    return { valid: false, reason: "invalid_url_syntax" };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const headRes = await fetchFn(url, {
      method: "HEAD",
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36" },
    }).catch(async () => {
      return await fetchFn(url, {
        method: "GET",
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36", Range: "bytes=0-2048" },
      });
    });
    clearTimeout(timer);

    if (!headRes.ok) {
      return { valid: false, status: headRes.status, reason: `http_status_${headRes.status}` };
    }

    const contentType = (headRes.headers.get("content-type") || "").toLowerCase();
    if (!contentType.startsWith("image/") || contentType.includes("text/html")) {
      return { valid: false, status: headRes.status, contentType, reason: "invalid_content_type" };
    }

    return { valid: true, status: headRes.status, contentType };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "network_error";
    return { valid: false, reason: message };
  }
}

export function rankCoverCandidates(
  article: EditorialArticleContext,
  candidates: EditorialCoverCandidate[],
): Array<{ candidate: EditorialCoverCandidate; relevance: CoverRelevanceScore }> {
  const scored = candidates.map((candidate) => ({
    candidate,
    relevance: validateCoverRelevance(article, candidate),
  }));

  const valid = scored.filter((item) => item.relevance.relevant);

  valid.sort((a, b) => {
    if (a.relevance.priority !== b.relevance.priority) {
      return a.relevance.priority - b.relevance.priority;
    }
    return b.relevance.score - a.relevance.score;
  });

  return valid;
}

export async function resolveCoverCascade(
  article: EditorialArticleContext,
  candidates: EditorialCoverCandidate[],
  options?: {
    trustedOrigins?: Iterable<string>;
    fetchFn?: typeof fetch;
  },
): Promise<{
  selected: EditorialCoverCandidate | null;
  attempts: Array<{ candidate: EditorialCoverCandidate; reason: string }>;
}> {
  const attempts: Array<{ candidate: EditorialCoverCandidate; reason: string }> = [];

  for (const candidate of candidates) {
    if (!isRealDiscoveredImageUrl(candidate.url, options?.trustedOrigins)) {
      attempts.push({ candidate, reason: "fake_or_untrusted_url" });
      continue;
    }

    const relevance = validateCoverRelevance(article, candidate);
    if (!relevance.relevant) {
      attempts.push({ candidate, reason: relevance.reason || "irrelevant" });
      continue;
    }

    const validation = await validateImageUrl(candidate.url, options?.fetchFn);
    if (!validation.valid) {
      attempts.push({ candidate, reason: validation.reason || "technical_validation_failed" });
      continue;
    }

    const resolvedCandidate: EditorialCoverCandidate = {
      ...candidate,
      alt: candidate.alt?.trim() ? candidate.alt : generateFactualAltText(article, candidate),
    };

    return { selected: resolvedCandidate, attempts };
  }

  return { selected: null, attempts };
}

export function buildCoverAbsenceTelegramMessage(slot: string | number): string {
  return `❌ <b>Não foi possível publicar a matéria das ${slot}h.</b>\n\nNão encontrei uma imagem de capa válida e relacionada à pauta após verificar as fontes disponíveis.`;
}
