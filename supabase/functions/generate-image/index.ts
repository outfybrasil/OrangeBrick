import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleOptions, json, serviceClient } from "../_shared/platform.ts";

const promptTemplate = (description: string) =>
  `Imagem fotorrealista de ${description}. Estilo fotografia editorial, iluminação dramática, alta qualidade, resolução 4K. Mostrar o objeto ou a cena principal em um ambiente coerente com a matéria. Sem texto na imagem, sem marcas d'água.`;

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;
  if (request.method !== "POST") return json({ error: "Método não permitido" }, 405);

  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "Não autorizado" }, 401);

    const token = authorization.slice(7);
    const supabase = serviceClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || user?.app_metadata?.is_admin !== true) return json({ error: "Acesso negado" }, 403);

    const body = await request.json();
    const description = typeof body.description === "string" ? body.description.trim() : "";
    if (description.length < 10 || description.length > 800) {
      return json({ error: "A descrição deve ter entre 10 e 800 caracteres" }, 400);
    }

    const prompt = promptTemplate(description);
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1600&height=900&nologo=true&enhance=true&model=flux&seed=${seed}`;
    const probe = await fetch(url, { method: "GET", redirect: "follow" });
    const contentType = probe.headers.get("content-type")?.split(";")[0] || "";
    if (!probe.ok || !["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
      return json({ error: "O provedor não retornou uma imagem válida" }, 502);
    }
    const image = await probe.arrayBuffer();
    if (image.byteLength > 10 * 1024 * 1024) return json({ error: "Imagem acima do limite de 10 MB" }, 502);
    const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
    const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("post-images").upload(path, image, {
      contentType,
      cacheControl: "31536000",
      upsert: false,
    });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from("post-images").getPublicUrl(path);
    return json({ url: data.publicUrl, prompt });
  } catch {
    return json({ error: "Falha ao gerar imagem" }, 500);
  }
});
