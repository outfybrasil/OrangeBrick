import assert from "node:assert/strict";
import test from "node:test";
import { handleTelegramWebhook } from "../src/lib/telegram/bot.ts";

function withTelegramEnvironment(run: () => Promise<void>) {
  const originalToken = process.env.TELEGRAM_BOT_TOKEN;
  const originalAdminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
  process.env.TELEGRAM_BOT_TOKEN = "test-token";
  process.env.TELEGRAM_ADMIN_CHAT_ID = "999";
  globalThis.fetch = (async (input, init) => {
    requests.push({ url: String(input), body: JSON.parse(String(init?.body)) as Record<string, unknown> });
    return Response.json({ ok: true });
  }) as typeof fetch;

  return run().then(() => requests).finally(() => {
    if (originalToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
    else process.env.TELEGRAM_BOT_TOKEN = originalToken;
    if (originalAdminChatId === undefined) delete process.env.TELEGRAM_ADMIN_CHAT_ID;
    else process.env.TELEGRAM_ADMIN_CHAT_ID = originalAdminChatId;
    globalThis.fetch = originalFetch;
  });
}

test("rejects private Telegram commands from other chats and escapes user-controlled identifiers", async () => {
  const requests = await withTelegramEnvironment(() => handleTelegramWebhook({
    update_id: 1,
    message: {
      message_id: 10,
      chat: { id: 42 },
      from: { id: "<admin&>" },
      text: "/stats",
    },
  }));

  assert.equal(requests.length, 1);
  assert.equal(requests[0].body.chat_id, 42);
  assert.equal(requests[0].body.parse_mode, "HTML");
  assert.match(String(requests[0].body.text), /&lt;admin&amp;&gt;/);
  assert.doesNotMatch(String(requests[0].body.text), /<admin&>/);
});

test("returns the bot help message for the start command", async () => {
  const requests = await withTelegramEnvironment(() => handleTelegramWebhook({
    update_id: 2,
    message: {
      message_id: 11,
      chat: { id: 42 },
      from: { id: 42 },
      text: "/start",
    },
  }));

  assert.equal(requests.length, 1);
  assert.match(String(requests[0].body.text), /Bot Editorial Orange Brick/);
  assert.match(String(requests[0].body.text), /TELEGRAM_ADMIN_CHAT_ID/);
});
