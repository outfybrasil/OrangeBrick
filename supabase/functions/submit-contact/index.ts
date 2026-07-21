import { allowRequest, handleOptions, json, serviceClient } from "../_shared/platform.ts";

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;
  if (request.method !== "POST") return json({ error: "Método não permitido" }, 405);
  try {
    const rate = await allowRequest(request, "contact", 5, 3600);
    if (!rate.allowed) return json({ error: "Limite de mensagens atingido. Tente mais tarde." }, 429);
    const payload: unknown = await request.json();
    if (!payload || typeof payload !== "object") return json({ error: "Payload inválido" }, 400);
    const { name, company, email, budget, message, website } = payload as Record<string, unknown>;
    if (website) return json({ success: true });
    if (typeof name !== "string" || typeof company !== "string" || typeof email !== "string" || typeof message !== "string") {
      return json({ error: "Campos obrigatórios ausentes" }, 400);
    }
    if (name.trim().length < 2 || name.length > 120 || company.trim().length < 2 || company.length > 160 || message.trim().length < 10 || message.length > 3000 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return json({ error: "Dados do formulário inválidos" }, 400);
    }
    const allowedBudgets = new Set(["up_to_5k", "5k_to_20k", "above_20k"]);
    const { error } = await serviceClient().from("contact_submissions").insert({
      name: name.trim(),
      company: company.trim(),
      email: email.trim().toLowerCase(),
      budget: typeof budget === "string" && allowedBudgets.has(budget) ? budget : "up_to_5k",
      message: message.trim(),
      ip_hash: rate.identityHash,
    });
    if (error) throw error;
    return json({ success: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Erro interno" }, 500);
  }
});
