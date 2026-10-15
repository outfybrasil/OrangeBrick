import assert from "node:assert/strict";
import test from "node:test";
import { confirmedTelegramDelivery, telegramDelivery, youtubeDelivery, unavailableDelivery } from "../src/lib/publication-status.ts";

const now = Date.parse("2026-10-15T18:00:00Z");
const timestamp = new Date(now).toISOString();

test("only a confirmed rejection enables retry; queued, sent, stale or unknown Telegram results do not", () => {
  for (const value of ["pending", "sent", "cancelled", "unknown", "sending:test"]) assert.equal(telegramDelivery({value,updated_at:timestamp},now).canRetry,false);
  assert.equal(telegramDelivery({value:"failed",updated_at:timestamp},now).canRetry,true);
  assert.equal(telegramDelivery({value:"sending:test",updated_at:timestamp},now+121000).state,"unknown");
  assert.equal(telegramDelivery(null,now).state,"not_requested");
  assert.equal(unavailableDelivery().canRetry,false);
});

test("Telegram transport failures never trigger a second send or claim definitive failure", async () => {
  let calls = 0;
  assert.equal(await confirmedTelegramDelivery(async () => {calls++;throw new Error("timeout after request");}),"unknown");
  assert.equal(calls,1);
  assert.equal(await confirmedTelegramDelivery(async () => ({ok:false,error_code:429})),"failed");
  assert.equal(await confirmedTelegramDelivery(async () => ({ok:false,error_code:500})),"unknown");
  assert.equal(await confirmedTelegramDelivery(async () => ({ok:true})),"sent");
});

test("YouTube receipt preserves privacy labels and stale uploads block retries", () => {
  const publication = {status:"uploaded",updated_at:timestamp,video_id:"abcdefghijk",visibility:"private"};
  const received=youtubeDelivery(publication,now);
  assert.match(received.detail,/privado/);
  assert.equal(received.canRetry,false);
  assert.equal(received.url,"https://www.youtube.com/watch?v=abcdefghijk");
  assert.equal(youtubeDelivery({...publication,status:"uploading"},now+601000).state,"unknown");
  assert.equal(youtubeDelivery({...publication,status:"unknown"},now).canRetry,false);
  assert.equal(youtubeDelivery({...publication,status:"failed"},now).canRetry,true);
  assert.equal(youtubeDelivery({...publication,status:"preparing"},now+601000).canRetry,true);
  assert.equal(youtubeDelivery({...publication,video_id:"../../bad"},now).url,undefined);
});
