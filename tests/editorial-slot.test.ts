import assert from "node:assert/strict";
import test from "node:test";
import {
  claimEditorialSlot,
  isScheduledEditorialSlot,
  type EditorialSlotRecord,
  type EditorialSlotStore,
} from "../src/lib/server/editorial-slot.ts";

function createStore(initial: EditorialSlotRecord | null, postPublished = false) {
  let record = initial;
  const transitions: string[] = [];
  let inserts = 0;
  const store: EditorialSlotStore = {
    async readSlot() {
      return record;
    },
    async insertRunningSlot(_key, updatedAt) {
      inserts++;
      if (record) return false;
      record = { value: "running", updated_at: updatedAt };
      return true;
    },
    async isPostPublished() {
      return postPublished;
    },
    async compareAndSetSlot(_key, expectedValue, expectedUpdatedAt, nextValue, nextUpdatedAt) {
      if (!record || record.value !== expectedValue || record.updated_at !== expectedUpdatedAt) return false;
      record = { value: nextValue, updated_at: nextUpdatedAt };
      transitions.push(nextValue);
      return true;
    },
  };
  return { store, get record() { return record; }, transitions, get inserts() { return inserts; } };
}

test("accepts only the three scheduled editorial slots", () => {
  assert.equal(isScheduledEditorialSlot("11"), true);
  assert.equal(isScheduledEditorialSlot("12"), false);
  assert.equal(isScheduledEditorialSlot("17"), true);
  assert.equal(isScheduledEditorialSlot("20"), true);
  assert.equal(isScheduledEditorialSlot(null), false);
  assert.equal(isScheduledEditorialSlot("13"), false);
});

test("claims an empty publication slot once", async () => {
  const fixture = createStore(null);
  assert.equal(await claimEditorialSlot(fixture.store, "slot", 1_800_000_000_000), true);
  assert.equal(fixture.record?.value, "running");
  assert.equal(await claimEditorialSlot(fixture.store, "slot", 1_800_000_000_001), false);
  assert.equal(fixture.inserts, 1);
});

test("does not reclaim a recent running slot", async () => {
  const now = 1_800_000_000_000;
  const fixture = createStore({ value: "running", updated_at: new Date(now - 60_000).toISOString() });
  assert.equal(await claimEditorialSlot(fixture.store, "slot", now), false);
  assert.deepEqual(fixture.transitions, []);
});

test("reclaims a stale running slot with compare-and-set", async () => {
  const now = 1_800_000_000_000;
  const fixture = createStore({ value: "running", updated_at: new Date(now - 361_000).toISOString() });
  assert.equal(await claimEditorialSlot(fixture.store, "slot", now), true);
  assert.equal(fixture.record?.value, "running");
  assert.equal(fixture.record?.updated_at, new Date(now).toISOString());
});

test("allows only one concurrent retry to claim a stale slot", async () => {
  const now = 1_800_000_000_000;
  const fixture = createStore({ value: "running", updated_at: new Date(now - 361_000).toISOString() });
  const claims = await Promise.all([
    claimEditorialSlot(fixture.store, "slot", now),
    claimEditorialSlot(fixture.store, "slot", now),
  ]);
  assert.equal(claims.filter(Boolean).length, 1);
});

test("finalizes a stale publishing slot when the post is already published", async () => {
  const now = 1_800_000_000_000;
  const fixture = createStore({ value: "publishing:post-1", updated_at: new Date(now - 361_000).toISOString() }, true);
  assert.equal(await claimEditorialSlot(fixture.store, "slot", now), false);
  assert.equal(fixture.record?.value, "published:post-1");
});

test("reclaims a stale publishing slot only when its post remains unpublished", async () => {
  const now = 1_800_000_000_000;
  const fixture = createStore({ value: "publishing:post-1", updated_at: new Date(now - 361_000).toISOString() });
  assert.equal(await claimEditorialSlot(fixture.store, "slot", now), true);
  assert.equal(fixture.record?.value, "running");
});

test("fails closed for an invalid timestamp in slot state", async () => {
  const fixture = createStore({ value: "running", updated_at: "invalid" });
  assert.equal(await claimEditorialSlot(fixture.store, "slot"), false);
});

test("proceeds without a persistent lock when the slot table is missing", async () => {
  const missingRelation = { code: "PGRST205", message: "not in schema cache" };
  const fixture = createStore(null);
  const store: EditorialSlotStore = {
    ...fixture.store,
    async readSlot() {
      throw missingRelation;
    },
  };
  assert.equal(await claimEditorialSlot(store, "slot"), true);
  assert.equal(fixture.inserts, 0);
});

test("rethrows slot read failures that are not a missing table", async () => {
  const fixture = createStore(null);
  const store: EditorialSlotStore = {
    ...fixture.store,
    async readSlot() {
      throw new Error("connection reset");
    },
  };
  await assert.rejects(claimEditorialSlot(store, "slot"), /connection reset/);
});
