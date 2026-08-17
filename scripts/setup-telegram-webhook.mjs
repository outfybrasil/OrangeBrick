const botToken = process.env.TELEGRAM_BOT_TOKEN;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://orange-brick.vercel.app";
const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;

if (!botToken) {
  console.error("❌ Erro: TELEGRAM_BOT_TOKEN não encontrado no .env.local");
  process.exit(1);
}

const webhookUrl = `${siteUrl}/api/telegram/webhook`;
console.log(`Configurando Webhook do Telegram para:\n${webhookUrl}\n`);

const payload = {
  url: webhookUrl,
  allowed_updates: ["message", "callback_query"],
};

if (secretToken) {
  payload.secret_token = secretToken;
}

const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

const data = await res.json();

if (data.ok) {
  console.log("✅ Webhook configurado com sucesso no Telegram!");
  console.log("Agora o seu bot já responderá aos cliques e comandos.");
} else {
  console.error("❌ Falha ao configurar Webhook:", data.description);
}
