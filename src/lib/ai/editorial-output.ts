export const EDITORIAL_RESPONSE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    category: { type: "string", enum: ["breaking", "hardware", "industry", "modding", "review", "opinion"] },
    source_name: { type: "string" },
    source_url: { type: "string" },
    information_status: { type: "string", enum: ["confirmed", "developing", "rumor", "updated", "corrected"] },
    quote_text: { type: "string" },
    quote_author: { type: "string" },
    quote_role: { type: "string" },
    quote_source_url: { type: "string" },
    absence_registered: { type: "boolean" },
    short_article_reason: { type: "string" },
    cover_image_query: { type: "string" },
    cover_alt: { type: "string" },
    image_1_query: { type: "string" },
    image_1_alt: { type: "string" },
    image_1_caption: { type: "string" },
    image_2_query: { type: "string" },
    image_2_alt: { type: "string" },
    image_2_caption: { type: "string" },
    intro_text: { type: "string" },
    development_text: { type: "string" },
    conclusion_text: { type: "string" },
  },
  required: [
    "title",
    "summary",
    "category",
    "source_name",
    "source_url",
    "information_status",
    "quote_text",
    "quote_author",
    "quote_role",
    "quote_source_url",
    "absence_registered",
    "short_article_reason",
    "cover_image_query",
    "cover_alt",
    "image_1_query",
    "image_1_alt",
    "image_1_caption",
    "image_2_query",
    "image_2_alt",
    "image_2_caption",
    "intro_text",
    "development_text",
    "conclusion_text",
  ],
} as const;

export const GAMING_CLASSIFICATION_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    gaming: { type: "boolean" },
  },
  required: ["gaming"],
} as const;

const stringFields = [
  "title",
  "summary",
  "category",
  "source_name",
  "source_url",
  "information_status",
  "quote_text",
  "quote_author",
  "quote_role",
  "quote_source_url",
  "short_article_reason",
  "cover_image_query",
  "cover_alt",
  "image_1_query",
  "image_1_alt",
  "image_1_caption",
  "image_2_query",
  "image_2_alt",
  "image_2_caption",
  "intro_text",
  "development_text",
  "conclusion_text",
] as const;

const categories = new Set(["breaking", "hardware", "industry", "modding", "review", "opinion"]);
const informationStatuses = new Set(["confirmed", "developing", "rumor", "updated", "corrected"]);

export interface EditorialGeminiOutput {
  title: string;
  summary: string;
  category: string;
  source_name: string;
  source_url: string;
  information_status: string;
  quote_text: string;
  quote_author: string;
  quote_role: string;
  quote_source_url: string;
  absence_registered: boolean;
  short_article_reason: string;
  cover_image_query: string;
  cover_alt: string;
  image_1_query: string;
  image_1_alt: string;
  image_1_caption: string;
  image_2_query: string;
  image_2_alt: string;
  image_2_caption: string;
  intro_text: string;
  development_text: string;
  conclusion_text: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseGamingClassificationJson(json: string): boolean {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new Error("A resposta do classificador não contém JSON válido.");
  }
  if (!isRecord(value) || Object.keys(value).length !== 1 || typeof value.gaming !== "boolean") {
    throw new Error("A resposta do classificador precisa conter apenas gaming como booleano.");
  }
  return value.gaming;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function parseEditorialGeminiOutput(value: unknown): EditorialGeminiOutput {
  if (!isRecord(value)) throw new Error("A resposta editorial precisa ser um objeto JSON.");

  const permittedFields = new Set<string>([...stringFields, "absence_registered"]);
  if (Object.keys(value).some((field) => !permittedFields.has(field))) {
    throw new Error("A resposta editorial contém campos não reconhecidos.");
  }

  for (const field of stringFields) {
    if (typeof value[field] !== "string") throw new Error(`Campo editorial inválido: ${field}.`);
  }
  if (typeof value.absence_registered !== "boolean") {
    throw new Error("Campo editorial inválido: absence_registered.");
  }

  const output = Object.fromEntries([
    ...stringFields.map((field) => [field, value[field]]),
    ["absence_registered", value.absence_registered],
  ]) as unknown as EditorialGeminiOutput;

  if (!categories.has(output.category)) throw new Error("Categoria editorial inválida.");
  if (!informationStatuses.has(output.information_status)) throw new Error("Status editorial inválido.");
  if (!output.title.trim() || !output.summary.trim() || !output.source_name.trim()) {
    throw new Error("Título, resumo e fonte original são obrigatórios.");
  }
  if (!isHttpUrl(output.source_url)) throw new Error("URL da fonte original inválida.");
  if (output.quote_source_url && !isHttpUrl(output.quote_source_url)) throw new Error("URL da citação inválida.");

  if (output.quote_text.trim()) {
    if (!output.quote_author.trim() || !output.quote_role.trim() || !isHttpUrl(output.quote_source_url)) {
      throw new Error("Citação precisa de autor, função e fonte verificável.");
    }
    if (output.absence_registered) throw new Error("A resposta não pode registrar ausência de fala e incluir uma citação ao mesmo tempo.");
  } else if (!output.absence_registered) {
    throw new Error("A resposta precisa incluir uma fala verificada ou registrar sua ausência.");
  }

  return output;
}

export function parseEditorialGeminiJson(json: string): EditorialGeminiOutput {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    const firstBrace = json.indexOf("{");
    const lastBrace = json.lastIndexOf("}");
    if (firstBrace < 0 || lastBrace <= firstBrace) throw new Error("A resposta do modelo não contém JSON válido.");
    value = JSON.parse(json.slice(firstBrace, lastBrace + 1));
  }
  return parseEditorialGeminiOutput(value);
}

export function serializeUntrustedEditorialData(value: unknown): string {
  return JSON.stringify(value) ?? "null";
}
