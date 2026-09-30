import assert from "node:assert/strict";
import test from "node:test";
import { generateWithProviderFallback } from "../src/lib/ai/provider-fallback.ts";

test("tries the next Gemini model after a failure and returns its grounding sources", async () => {
  const attempts: string[] = [];
  let groqCalls = 0;
  const result = await generateWithProviderFallback(
    ["gemini-primary", "gemini-secondary"],
    "editorial prompt",
    10_000,
    {
      now: () => 1_000,
      async generateGemini(model) {
        attempts.push(model);
        if (model === "gemini-primary") throw new Error("temporary failure");
        return { text: "valid JSON", sources: [{ name: "Official source", url: "https://example.com" }] };
      },
      async generateGroq() {
        groqCalls++;
        return "fallback JSON";
      },
    }
  );

  assert.deepEqual(attempts, ["gemini-primary", "gemini-secondary"]);
  assert.equal(groqCalls, 0);
  assert.deepEqual(result, {
    text: "valid JSON",
    sources: [{ name: "Official source", url: "https://example.com" }],
  });
});

test("uses Groq after Gemini responses are empty or fail", async () => {
  const attempts: string[] = [];
  const failures: string[] = [];
  const fallbacks: string[][] = [];
  let receivedPrompt = "";
  let receivedDeadline = 0;
  const result = await generateWithProviderFallback(
    ["gemini-empty", "gemini-failing"],
    "editorial prompt",
    10_000,
    {
      now: () => 1_000,
      async generateGemini(model) {
        attempts.push(model);
        if (model === "gemini-empty") return { text: "" };
        throw new Error("provider unavailable");
      },
      async generateGroq(prompt, deadline) {
        receivedPrompt = prompt;
        receivedDeadline = deadline;
        return "fallback JSON";
      },
      onGeminiFailure(model, message) {
        failures.push(`${model}:${message}`);
      },
      onGeminiFallback(errors) {
        fallbacks.push(errors);
      },
    }
  );

  assert.deepEqual(attempts, ["gemini-empty", "gemini-failing"]);
  assert.deepEqual(failures, ["gemini-failing:provider unavailable"]);
  assert.deepEqual(fallbacks, [["gemini-failing: provider unavailable"]]);
  assert.equal(receivedPrompt, "editorial prompt");
  assert.equal(receivedDeadline, 10_000);
  assert.deepEqual(result, { text: "fallback JSON", sources: [] });
});

test("does not start a provider call after the global deadline expires", async () => {
  const models: string[] = [];
  const result = await generateWithProviderFallback(
    ["gemini-primary", "gemini-secondary"],
    "editorial prompt",
    1_000,
    {
      now: () => 1_000,
      async generateGemini(model) {
        models.push(model);
        return { text: "unreachable" };
      },
      async generateGroq() {
        return "fallback JSON";
      },
    }
  );

  assert.deepEqual(models, []);
  assert.deepEqual(result, { text: "fallback JSON", sources: [] });
});

test("stops trying Gemini after a successful response", async () => {
  const attempts: string[] = [];
  const result = await generateWithProviderFallback(
    ["gemini-primary", "gemini-secondary"],
    "editorial prompt",
    10_000,
    {
      now: () => 1_000,
      async generateGemini(model) {
        attempts.push(model);
        return { text: "  " };
      },
      async generateGroq() {
        throw new Error("unexpected fallback");
      },
    }
  );

  assert.deepEqual(attempts, ["gemini-primary"]);
  assert.deepEqual(result, { text: "  ", sources: [] });
});
