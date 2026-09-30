import assert from "node:assert/strict";
import test from "node:test";
import { createSupabaseCookieAdapter } from "../src/lib/server/supabase-cookies.ts";

test("reads current cookies and persists every Supabase refresh cookie", () => {
  const cookies = new Map([[
    "sb-access-token",
    { name: "sb-access-token", value: "old-access" },
  ]]);
  const writes: Array<{ name: string; value: string; options?: { httpOnly?: boolean; sameSite?: string } }> = [];
  const cookieStore = {
    getAll: () => [...cookies.values()],
    set: (name: string, value: string, options?: { httpOnly?: boolean; sameSite?: string }) => {
      writes.push({ name, value, options });
      cookies.set(name, { name, value });
    },
  };
  const adapter = createSupabaseCookieAdapter(cookieStore);

  assert.deepEqual(adapter.getAll(), [{ name: "sb-access-token", value: "old-access" }]);

  adapter.setAll([
    { name: "sb-access-token", value: "new-access", options: { httpOnly: true, sameSite: "lax" } },
    { name: "sb-refresh-token", value: "new-refresh", options: { httpOnly: true, sameSite: "lax" } },
  ]);

  assert.deepEqual(writes, [
    { name: "sb-access-token", value: "new-access", options: { httpOnly: true, sameSite: "lax" } },
    { name: "sb-refresh-token", value: "new-refresh", options: { httpOnly: true, sameSite: "lax" } },
  ]);
  assert.deepEqual(adapter.getAll(), [
    { name: "sb-access-token", value: "new-access" },
    { name: "sb-refresh-token", value: "new-refresh" },
  ]);
});
