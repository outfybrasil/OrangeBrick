import test from "node:test";
import assert from "node:assert/strict";
import { getSiteUrl } from "../src/lib/site-url.ts";

test("loads the news generator and Telegram modules in the Node script runtime", async () => {
  await import("../src/lib/ai/gemini-news.ts");
  await import("../src/lib/telegram/bot.ts");
});

test("keeps the public site URL on a validated origin", () => {
  const previous = process.env.NEXT_PUBLIC_SITE_URL;
  try {
    process.env.NEXT_PUBLIC_SITE_URL = "https://orange-brick.example/path?q=1";
    assert.equal(getSiteUrl(), "https://orange-brick.example");
    process.env.NEXT_PUBLIC_SITE_URL = "javascript:alert(1)";
    assert.equal(getSiteUrl(), "http://localhost:3000");
    process.env.NEXT_PUBLIC_SITE_URL = "https://user:pass@orange-brick.example";
    assert.equal(getSiteUrl(), "http://localhost:3000");
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previous;
  }
});
