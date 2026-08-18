const botToken = process.env.TELEGRAM_BOT_TOKEN;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://orange-brick.vercel.app";
const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;

if (!botToken) {
  console.error("❌ Erro: TELEGRAM_BOT_TOKEN não encontrado nas variáveis de ambiente");
  process.exit(1);
}

const webhookUrl = `${siteUrl}/api/telegram/webhook`;
console.log(`Configurando Webhook do Telegram para:\n${webhookUrl}\n`);

const payload = {
  url: webhookUrl,
  allowed_updates: ["message", "callback_query"],
  drop_pending_updates: false,
};

if (secretToken) {
  payload.secret_token = secretToken.trim().replace(/^["']|["']$/g, "");
}

async function configureWebhook(retries = 3) {
  for (let i = 1; i <= retries; i++) {
    try {
      console.log(`Tentativa ${i} de configurar webhook em api.telegram.org...`);
      const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000),
      });
      const data = await res.json();
      if (data.ok) {
        console.log("✅ Webhook configurado com sucesso no Telegram!");
        break;
      } else {
        console.error("❌ Falha ao configurar Webhook:", data.description);
        return;
      }
    } catch (err) {
      console.warn(`⚠️ Tentativa ${i} falhou:`, err.message || err);
      if (i < retries) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  const commands = [
    { command: "hoje", description: "Apura e redige a principal matéria de games do dia" },
    { command: "gerar", description: "Cria matéria completa sobre um jogo ou tema específico" },
    { command: "rascunhos", description: "Lista os últimos rascunhos pendentes" },
    { command: "status", description: "Verifica status da IA, banco de dados e site" },
    { command: "ajuda", description: "Mostra os comandos e instruções do bot" },
  ];

  try {
    const cmdRes = await fetch(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commands }),
      signal: AbortSignal.timeout(15000),
    });
    const cmdData = await cmdRes.json();
    if (cmdData.ok) {
      console.log("✅ Menu de comandos configurado no Telegram!");
    }
  } catch (err) {
    console.warn("⚠️ Aviso ao registrar menu de comandos:", err.message || err);
  }
}

await configureWebhook();
