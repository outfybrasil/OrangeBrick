import assert from "node:assert/strict";
import test from "node:test";
import {
  detectPlatform,
  isInAppBrowser,
  permissionMessage,
  permissionSteps,
  resolvePermissionOutcome,
} from "../src/lib/push-permission.ts";

const androidChrome = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const iphoneSafari = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const windowsChrome = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

test("identifica iOS, Android e desktop", () => {
  assert.equal(detectPlatform(iphoneSafari, "iPhone", 5), "ios");
  assert.equal(detectPlatform(windowsChrome, "MacIntel", 5), "ios");
  assert.equal(detectPlatform(androidChrome, "Linux armv8l", 5), "android");
  assert.equal(detectPlatform(windowsChrome, "Win32", 0), "desktop");
});

test("trata retorno indefinido do Safari antigo usando a permissão atual", () => {
  assert.equal(resolvePermissionOutcome(undefined, "granted"), "granted");
  assert.equal(resolvePermissionOutcome(undefined, "default"), "dismissed");
  assert.equal(resolvePermissionOutcome("default", "denied"), "denied");
  assert.equal(resolvePermissionOutcome("granted", "granted"), "granted");
});

test("mensagem de bloqueio ensina onde liberar a permissão", () => {
  assert.match(permissionMessage("denied"), /bloqueados/);
  assert.match(permissionMessage("dismissed"), /Tentar de novo/);
  assert.match(permissionSteps("ios").join(" "), /Ajustes/);
  assert.match(permissionSteps("android").join(" "), /cadeado/);
  assert.match(permissionSteps("desktop").join(" "), /cadeado/);
});

test("reconhece navegador interno sem suporte a push", () => {
  assert.equal(isInAppBrowser("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Instagram 320.0.0"), true);
  assert.equal(isInAppBrowser("Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 Chrome/126.0.0.0"), true);
  assert.equal(isInAppBrowser(androidChrome), false);
  assert.equal(isInAppBrowser(windowsChrome), false);
});
