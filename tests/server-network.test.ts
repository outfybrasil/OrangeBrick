import assert from "node:assert/strict";
import test from "node:test";
import { isRestrictedAddress, readResponseBuffer } from "../src/lib/server/network.ts";

test("blocks private, reserved, and IPv4-mapped IPv6 addresses", () => {
  for (const address of [
    "0.0.0.0",
    "10.0.0.1",
    "127.0.0.1",
    "169.254.10.20",
    "192.168.1.10",
    "198.51.100.4",
    "::",
    "::1",
    "fc00::1",
    "fe80::1",
    "::ffff:7f00:1",
  ]) {
    assert.equal(isRestrictedAddress(address), true, address);
  }
});

test("allows global unicast IPv4 and IPv6 addresses", () => {
  assert.equal(isRestrictedAddress("8.8.8.8"), false);
  assert.equal(isRestrictedAddress("2606:4700:4700::1111"), false);
});

test("enforces response size while reading the stream", async () => {
  const response = new Response(new Uint8Array(8));
  await assert.rejects(readResponseBuffer(response, 4), /tamanho máximo/);
});
