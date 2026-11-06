import type { ReelScriptData } from "../video/reel-script.ts";

export interface SocialCopys {
  instagram: {
    caption: string;
    hashtags: string[];
  };
  tiktok: {
    caption: string;
    hashtags: string[];
  };
  youtube: {
    title: string;
    description: string;
    tags: string[];
  };
}


export function generateSocialCopys(post: {
  title: string;
  summary: string;
  slug: string;
  category: string;
  script?: ReelScriptData | null;
}, options: { format?: "reel" | "post" | "carousel"; includeCommentPrompt?: boolean } = {}): SocialCopys {
  const format = options.format || "reel";
  const plainText = (value: string) => value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  const title = plainText(post.title);
  const danglingEnding = /\b(?:de|do|da|dos|das|em|no|na|nos|nas|para|por|com|que|e|ou|mas|a|o|as|os|um|uma|seu|sua|seus|suas|entre|sobre|até|após|antes|durante)\s*[.!?]*$/iu;
  const hasIncompleteEnding = (value: string) => /…|\.{3}/u.test(value) || value.split(/(?<=[.!?])\s+/u).some((sentence) => danglingEnding.test(sentence.trim()));
  const completeTitle = hasIncompleteEnding(title) ? "Veja a matéria completa." : title;
  const rawSummary = plainText(post.summary);
  const summary = rawSummary && !hasIncompleteEnding(rawSummary) ? rawSummary : completeTitle;
  const rawHook = plainText(post.script?.hook || title);
  const hook = hasIncompleteEnding(rawHook) ? completeTitle : rawHook;
  const narration = plainText(post.script?.narrationText || "");
  const narrationWords = narration ? narration.split(/\s+/).length : 0;
  const narrationIsComplete = narrationWords >= 75 && narrationWords <= 95 && /[.!?]$/u.test(narration) && !hasIncompleteEnding(narration);
  const suppliedQuestion = plainText(post.script?.ctaQuestion || "");
  const releaseTitle = completeTitle.match(/^(.*?)\s+(?:chega|estreia|lança|recebe|ganha)\b/i)?.[1]?.trim();
  const releaseQuestion = releaseTitle && post.category === "breaking" &&
    /\b(?:estreia|lançamento|data de lançamento|chega em)\b/i.test(summary) &&
    !/\b(?:playstation|ps[45]|xbox|nintendo|switch|sony|microsoft|ubisoft|steam)\b/i.test(releaseTitle)
    ? `Você pretende jogar ${releaseTitle} no lançamento?`
    : "";
  const fallbackQuestions: Record<string, string> = {
    breaking: "O que essa notícia muda para você como jogador?",
    hardware: "Esse hardware entra na sua lista de compras?",
    industry: "Como essa decisão pode afetar os próximos jogos?",
    modding: "Você levaria essa modificação a sério?",
    review: "Você daria uma chance a esse jogo?",
    opinion: "Você concorda com essa leitura?",
  };
  const genericQuestion = /^(?:o que você acha dessa mudança|qual é a sua opinião sobre essa notícia|o que essa notícia muda para quem joga)\?$/i;
  const question = suppliedQuestion && suppliedQuestion.endsWith("?") && !hasIncompleteEnding(suppliedQuestion) && !genericQuestion.test(suppliedQuestion)
    ? suppliedQuestion
    : releaseQuestion || fallbackQuestions[post.category] || "Que impacto essa notícia teria para você como jogador?";
  const hookPrefix = hook.replace(/[.!?…]+$/, "").trim();
  const escapedHookPrefix = hookPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const summaryAfterHook = summary.replace(new RegExp(`^${escapedHookPrefix}(?=$|[\\s,;:!?])[,;:!?\\s]*`, "iu"), "").trim();
  const supportingSummary = summaryAfterHook
    ? `${summaryAfterHook[0].toLocaleUpperCase("pt-BR")}${summaryAfterHook.slice(1)}`
    : summary === hook ? "" : summary;
  const articleUrl = `https://orangebrick.blog/${format === "reel" ? "reels" : "posts"}/${encodeURIComponent(post.slug)}`;
  const trackedArticleUrl = (source: string, medium: string) => `${articleUrl}?utm_source=${source}&utm_medium=${medium}&utm_campaign=${format === "reel" ? "reel" : "post"}&utm_content=${encodeURIComponent(post.slug)}`;
  const attribution = post.script?.ttsProvider === "elevenlabs" ? "Narração: elevenlabs.io" : "";
  const seriesByCategory: Record<string, { label: string }> = {
    breaking: { label: "Plantão OB" },
    hardware: { label: "Hard News OB" },
    industry: { label: "Radar OB" },
    modding: { label: "Gambiarra OB" },
    review: { label: "Review OB" },
    opinion: { label: "Opinião OB" },
  };
  const series = seriesByCategory[post.category] || { label: "Orange Brick" };
  const seriesLine = `${series.label} — Orange Brick`;
  const youtubeTitleSource = Array.from(hook).length <= 70 ? hook : completeTitle;
  const youtubeTitleCharacters = Array.from(youtubeTitleSource);
  const youtubeTitle = youtubeTitleCharacters.length <= 70
    ? youtubeTitleSource
    : `${youtubeTitleCharacters.slice(0, 69).join("").replace(/\s+\S*$/, "").trimEnd()}…`;
  const categoryTags: Record<string, string[]> = {
    breaking: ["Notícias de games"],
    hardware: ["Hardware"],
    industry: ["Indústria de games"],
    modding: ["Modding"],
    review: ["Análise de jogos"],
    opinion: ["Opinião"],
  };
  const subjectHashtags: Array<[RegExp, string]> = [
    [/\b(?:god\s+of\s+war|gow)\b/i, "GodOfWar"],
    [/\b(?:marvel.s\s+)?wolverine\b/i, "Wolverine"],
    [/\bhalo\b/i, "Halo"],
    [/\bstarfield\b/i, "Starfield"],
    [/\b(?:super\s+)?mario\b/i, "SuperMario"],
    [/\bmetroid\b/i, "Metroid"],
    [/\bdonkey\s+kong\b/i, "DonkeyKong"],
    [/\bforza\b/i, "Forza"],
    [/\bgears(?:\s+of\s+war)?\b/i, "GearsOfWar"],
    [/\bthe\s+last\s+of\s+us\b/i, "TheLastOfUs"],
    [/\bfinal\s+fantasy\s*(?:vii|7)\b/i, "FinalFantasyVII"],
    [/\bgame\s*pass\b/i, "GamePass"],
    [/\bsaros\b/i, "Saros"],
    [/\bfaraway\b/i, "Faraway"],
    [/\bedgerunners?\b/i, "CyberpunkEdgerunners"],
    [/\bcyberpunk\s*2077\b/i, "Cyberpunk2077"],
    [/\bcyberpunk\b/i, "Cyberpunk"],
    [/\bhideo\s+kojima\b/i, "HideoKojima"],
    [/\b(?:call\s+of\s+duty|cod)\b/i, "CallOfDuty"],
    [/\bmodern\s+warfare\s*4\b/i, "ModernWarfare4"],
    [/\bocarina\s+of\s+time\b/i, "OcarinaOfTime"],
    [/\bpalworld\b/i, "Palworld"],
    [/\bzelda\b/i, "Zelda"],
    [/\bpokemon\b/i, "Pokemon"],
    [/\bubisoft\b/i, "Ubisoft"],
    [/\bredlynx\b/i, "RedLynx"],
    [/\btrials\b/i, "Trials"],
    [/\b(?:singapore|singapura)\b/i, "UbisoftSingapore"],
    [/\b(?:ps\s*plus|playstation\s*plus)\b/i, "PSPlus"],
    [/\bxbox\s+nano\b/i, "XboxNano"],
    [/\bcrash\s+keys\b/i, "CrashKeys"],
    [/\bzero\s+escape\b/i, "ZeroEscape"],
    [/\b(?:gta\s*(?:6|vi)|grand\s+theft\s+auto\s*(?:6|vi))\b/i, "GTA6"],
    [/\bkutaragi\b/i, "KenKutaragi"],
    [/\b(?:disco|m[ií]dia\s+f[ií]sica)\b/i, "MidiaFisica"],
    [/\bhoyo(?:verse)?\b/i, "Hoyoverse"],
    [/\belden\s*ring\b/i, "EldenRing"],
    [/\bcapcom\b/i, "Capcom"],
    [/\bkonami\b/i, "Konami"],
    [/\bvalve\b/i, "Valve"],
    [/\bpc\s*gamer\b/i, "PCGamer"],
    [/\bremake\b/i, "Remake"],
    [/\bremaster\b/i, "Remaster"],
    [/\b(?:playstation|ps[45]|sony)\b/i, "PlayStation"],
    [/\b(?:xbox|microsoft)\b/i, "Xbox"],
    [/\b(?:nintendo|switch\s*2?)\b/i, "Nintendo"],
    [/\bsteam\b/i, "Steam"],
  ];
  const searchableCopy = `${title} ${summary} ${hook}`;
  const platformTags = [
    ...(/\b(?:playstation|ps[45])\b/i.test(searchableCopy) ? ["PlayStation"] : []),
    ...(/\bxbox\b/i.test(searchableCopy) ? ["Xbox"] : []),
    ...(/\bswitch\s*2\b/i.test(searchableCopy) ? ["NintendoSwitch2"] : /\b(?:nintendo|switch)\b/i.test(searchableCopy) ? ["Nintendo"] : []),
    ...(/\b(?:pc|steam)\b/i.test(searchableCopy) ? ["PCGaming"] : []),
  ];
  const subjectTags = subjectHashtags
    .filter(([pattern]) => pattern.test(searchableCopy))
    .slice(0, 2)
    .map(([, hashtag]) => hashtag);
  const relatedSubjectPairs = new Set([
    "CyberpunkEdgerunners|Cyberpunk",
    "CallOfDuty|ModernWarfare4",
    "OcarinaOfTime|Zelda",
    "FinalFantasyVII|GamePass",
  ]);
  const selectedSubjectTags = subjectTags.length === 2 && relatedSubjectPairs.has(subjectTags.join("|"))
    ? subjectTags
    : subjectTags.slice(0, 1);
  const ignoredSlugWords = new Set(["para", "como", "sobre", "depois", "antes", "entre", "noticia", "noticias", "news", "games", "game", "chega", "chegam", "ganha", "ganham", "recebe", "recebem", "anuncia", "anunciam", "confirma", "confirmam", "revela", "revelam", "novo", "nova", "novos", "novas", "oficial", "data", "lancamento", "jogo", "jogos"]);
  const fallbackTopic = post.slug
    .toLocaleLowerCase("pt-BR")
    .split("-")
    .find((word) => word.length >= 4 && !ignoredSlugWords.has(word));
  const subjects = [...new Set([
    ...selectedSubjectTags,
    ...(selectedSubjectTags.length === 0 && fallbackTopic ? [`${fallbackTopic[0].toLocaleUpperCase("pt-BR")}${fallbackTopic.slice(1)}`] : []),
  ])].slice(0, 2);
  const uniqueHashtags = (names: string[]) => [...new Map(names.map(name => [name.toLocaleLowerCase("pt-BR"), name])).values()];
  const contextTags = uniqueHashtags([...subjects, ...platformTags]).slice(0, 2);
  const nonGameTags = new Set(["GamePass", "HideoKojima", "Ubisoft", "RedLynx", "UbisoftSingapore", "PSPlus", "XboxNano", "KenKutaragi", "MidiaFisica", "Hoyoverse", "Capcom", "Konami", "Valve", "PCGamer", "Remake", "Remaster", "PlayStation", "Xbox", "Nintendo", "Steam"]);
  const gameMatches = subjectHashtags.filter(([pattern, name]) => !nonGameTags.has(name) && pattern.test(searchableCopy));
  const titleGames = gameMatches.filter(([pattern]) => pattern.test(title)).sort(([left], [right]) => title.search(left) - title.search(right));
  const titlePrefix = title.replace(/^(?:rumor|atualiza[cç][aã]o):\s*/i, "").match(/^(.+?)\s+(?:chega|estreia|ganha|recebe|ter[aá]|vence|revela|anuncia|confirma|promete|[eé]\s+(?:anunciado|adiado|lan[cç]ado))\b/i)?.[1]?.trim();
  const inferredGame = titlePrefix && titlePrefix.length <= 65 && !/\b(?:sony|playstation|xbox|microsoft|nintendo|ubisoft|rockstar|capcom|konami|ind[uú]stria|jogadores|novo|nova|not[ií]cia)\b/i.test(titlePrefix) ? titlePrefix.replace(/[^\p{L}\p{N}]/gu, "") : "";
  const leadGame = titleGames[0]?.[1] || inferredGame || gameMatches[0]?.[1];
  const consoleBrands = [
    ...(/\b(?:playstation|ps[45]|sony)\b/i.test(searchableCopy) ? ["PlayStation"] : []),
    ...(/\b(?:xbox|microsoft)\b/i.test(searchableCopy) ? ["Xbox"] : []),
    ...(/\b(?:nintendo|switch)\b/i.test(searchableCopy) ? ["Nintendo"] : []),
  ];
  const franchiseBrand = leadGame && ["GodOfWar", "Wolverine", "TheLastOfUs"].includes(leadGame) ? "PlayStation"
    : leadGame && ["Halo", "Forza", "GearsOfWar"].includes(leadGame) ? "Xbox"
      : leadGame && ["SuperMario", "Metroid", "DonkeyKong", "Zelda", "OcarinaOfTime", "Pokemon"].includes(leadGame) ? "Nintendo" : "";
  const feedContext = uniqueHashtags([...(leadGame ? [leadGame] : subjects), ...consoleBrands, ...(franchiseBrand ? [franchiseBrand] : []), ...platformTags]).filter(name => !["gaming", "gamer", "viral", "instagram", "carrossel", "noticiasdegames"].includes(name.toLowerCase())).slice(0, 3);
  const instagramHashtagNames = format === "reel" ? uniqueHashtags([...contextTags, "Gaming", "Reels", "Viral"]).slice(0, 5) : uniqueHashtags([...feedContext, "Gaming", "Viral", "Gamer", "VideoGames"]).slice(0, 5);
  const tiktokHashtagNames = uniqueHashtags([...contextTags, "Gaming", "FYP", "Viral"]).slice(0, 5);
  const youtubeHashtagNames = uniqueHashtags(["Shorts", ...contextTags, "Gaming", "Viral"]).slice(0, 5);
  const instagramHashtags = instagramHashtagNames.map((hashtag) => `#${hashtag}`);
  const tiktokHashtags = tiktokHashtagNames.map((hashtag) => `#${hashtag.toLocaleLowerCase("pt-BR")}`);
  const coreCopy = narrationIsComplete ? [narration] : [hook, supportingSummary];
  const commentPrompt = narrationIsComplete ? "" : format === "reel" ? `Responda nos comentários: ${question}` : socialCommentPrompt(question);
  const instagramCaption = [
    ...coreCopy,
    ...(format === "reel" || options.includeCommentPrompt ? [commentPrompt] : []),
    `Matéria completa no link da bio: ${trackedArticleUrl("instagram", format)}`,
    "Siga @ob.labs para acompanhar as próximas notícias.",
    seriesLine,
    attribution,
    instagramHashtags.join(" "),
  ].filter(Boolean).join("\n\n");
  const tiktokCaption = [
    ...coreCopy,
    commentPrompt,
    "Matéria completa no link da bio.",
    "Siga para acompanhar as próximas notícias.",
    seriesLine,
    attribution,
    tiktokHashtags.join(" "),
  ].filter(Boolean).join("\n\n");
  const youtubeHashtags = youtubeHashtagNames.map((hashtag) => `#${hashtag}`).join(" ");
  const youtubeDescription = [
    ...coreCopy,
    commentPrompt,
    `Leia a matéria completa: ${trackedArticleUrl("youtube", "short")}`,
    "Inscreva-se no canal para acompanhar as próximas notícias.",
    seriesLine,
    attribution,
    youtubeHashtags,
  ].filter(Boolean).join("\n\n");

  return {
    instagram: {
      caption: instagramCaption,
      hashtags: instagramHashtags,
    },
    tiktok: {
      caption: tiktokCaption,
      hashtags: tiktokHashtags,
    },
    youtube: {
      title: youtubeTitle,
      description: youtubeDescription,
      tags: uniqueHashtags([
        ...subjects,
        ...platformTags,
        ...(categoryTags[post.category] || []),
        "Gaming",
        "Video Games",
        "Gaming News",
        "Shorts",
        series.label,
        "Orange Brick",
      ]).slice(0, 15),
    },
  };
}


export function socialCommentPrompt(question: string) {
  const spoken = question.replace(/para você como jogador/g, "pra você").replace(/para você/g, "pra você").replace(/^(Você|Qual|Quais|Como|Esse|Essa|O|A|Que)\b/u, word => word.toLocaleLowerCase("pt-BR"));
  return `Comenta aí: ${spoken}`;
}
