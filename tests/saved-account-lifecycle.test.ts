import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function createHarness(options: { session?: Record<string, unknown> | null; sessionError?: boolean; switchError?: boolean } = {}) {
  const saved = [{ userId: "saved-user", nickname: "Jogador", accessToken: "old-access", refreshToken: "old-refresh" }];
  const states: unknown[] = [];
  const effects: Array<() => unknown> = [];
  let authCallback: (event: string, session: unknown) => unknown = () => {};
  let index = 0;
  let storageAvailable = false;
  let state: { savedAccounts: unknown[]; isLoading: boolean; switchAccount: (id: string) => Promise<boolean> };
  const client = {
    auth: {
      getSession: async () => {
        if (options.sessionError) throw new Error("offline");
        return { data: { session: options.session || null } };
      },
      onAuthStateChange: (callback: typeof authCallback) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe() {} } } };
      },
      setSession: async () => ({ data: { session: null }, error: options.switchError ? new Error("offline") : null }),
    },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => { throw new Error("profile unavailable"); } }) }) }),
  };
  const accounts = {
    getSavedAccounts: () => storageAvailable ? saved.map(account => ({ ...account })) : [],
    saveAccount: (account: typeof saved[number]) => {
      const i = saved.findIndex(item => item.userId === account.userId);
      if (i >= 0) saved[i] = account;
      else saved.push(account);
    },
    removeSavedAccount: (id: string) => { const i = saved.findIndex(account => account.userId === id); if (i >= 0) saved.splice(i, 1); },
    upsertAccountFromSession: (user: { id: string }, _profile: unknown, session: { access_token: string; refresh_token: string }) => {
      accounts.saveAccount({ userId: user.id, nickname: "Jogador", accessToken: session.access_token, refreshToken: session.refresh_token });
    },
  };
  const react = {
    createContext: () => ({}),
    useMemo: (fn: () => unknown) => fn(),
    useCallback: (fn: unknown) => fn,
    useEffect: (fn: () => unknown) => effects.push(fn),
    useState: (initial: unknown) => {
      const i = index++;
      if (!(i in states)) states[i] = typeof initial === "function" ? initial() : initial;
      return [states[i], (value: unknown) => { states[i] = value; }];
    },
  };
  const exported: { AuthProvider?: (props: { children: null }) => unknown } = {};
  const code = ts.transpileModule(readFileSync(new URL("../src/lib/contexts/AuthContext.tsx", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, {
    exports: exported,
    setTimeout, clearTimeout,
    window: { addEventListener() {}, removeEventListener() {} },
    require: (name: string) => {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return { jsx: (_type: unknown, props: { value: typeof state }) => { state = props.value; return null; } };
      if (name.endsWith("supabase/client")) return { createDataClient: () => client };
      if (name.endsWith("saved-accounts")) return accounts;
      if (name.endsWith("avatar")) return { getGoogleAvatarUrl: () => null };
      return {};
    },
  });
  const render = () => { index = 0; effects.length = 0; exported.AuthProvider!({ children: null }); };
  render();
  storageAvailable = true;
  render();
  const cleanups = effects.map(effect => effect());
  return {
    saved,
    emit: (session: unknown) => authCallback("TOKEN_REFRESHED", session),
    async settle() { await new Promise(resolve => setTimeout(resolve, 15)); render(); return state!; },
    cleanup() { for (const cleanup of cleanups) if (typeof cleanup === "function") cleanup(); },
  };
}

test("restores saved accounts after hydration even without an active session", async () => {
  const harness = createHarness();
  try {
    const state = await harness.settle();
    assert.equal(state.savedAccounts.length, 1);
    assert.equal(state.isLoading, false);
  } finally { harness.cleanup(); }
});

test("keeps saved accounts and finishes loading when session recovery fails", async () => {
  const harness = createHarness({ sessionError: true });
  try {
    const state = await harness.settle();
    assert.equal(state.savedAccounts.length, 1);
    assert.equal(state.isLoading, false);
  } finally { harness.cleanup(); }
});

test("persists rotated tokens synchronously even when profile fetching fails", async () => {
  const harness = createHarness();
  try {
    await harness.settle();
    const returned = harness.emit({ user: { id: "saved-user" }, access_token: "new-access", refresh_token: "new-refresh" });
    assert.equal(returned, undefined);
    assert.equal(harness.saved[0].refreshToken, "new-refresh");
    await harness.settle();
    assert.equal(harness.saved[0].accessToken, "new-access");
  } finally { harness.cleanup(); }
});

test("does not erase a saved account when switching fails", async () => {
  const harness = createHarness({ switchError: true });
  try {
    const state = await harness.settle();
    assert.equal(await state.switchAccount("saved-user"), false);
    assert.equal(harness.saved.length, 1);
  } finally { harness.cleanup(); }
});
