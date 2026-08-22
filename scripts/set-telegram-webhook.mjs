import { existsSync, readFileSync } from "node:fs";

function getEnv(name) {
  const fromProcess = process.env[name];
  if (fromProcess) return fromProcess;
  if (!existsSync(".env.local")) return null;
  const match = readFileSync(".env.local", "utf8").match(new RegExp(`^${name}=(.*)$`, "m"));
  if (!match) return null;
  return match[1].trim().replace(/^["']|["']$/g, "");
}

const botToken = getEnv("TELEGRAM_BOT_TOKEN");
const webhookSecret = getEnv("TELEGRAM_WEBHOOK_SECRET");
const siteUrl = getEnv("NEXT_PUBLIC_SITE_URL") || "https://orange-brick.vercel.app";

if (!botToken || !webhookSecret) {
  console.error("Defina TELEGRAM_BOT_TOKEN e TELEGRAM_WEBHOOK_SECRET (via variável de ambiente ou .env.local).");
  process.exit(1);
}

const webhookUrl = `${siteUrl.replace(/\/$/, "")}/api/telegram/webhook`;

const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url: webhookUrl, secret_token: webhookSecret }),
});

const data = await res.json();
console.log(JSON.stringify(data, null, 2));
if (!data.ok) process.exit(1);