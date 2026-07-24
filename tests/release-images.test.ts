import assert from "node:assert/strict";
import test from "node:test";
import {
  releaseOutputDimensions,
  validateReleaseSourceDimensions,
  validateReleaseSourceUrl,
} from "../src/lib/release-images.ts";

test("recusa miniaturas de buscadores e imagens abaixo do mínimo", () => {
  assert.match(
    validateReleaseSourceUrl("https://encrypted-tbn0.gstatic.com/images?q=thumb") || "",
    /miniatura/
  );
  assert.match(validateReleaseSourceDimensions(596, 335) || "", /596 × 335/);
});

test("preserva uma arte 1240 × 698 sem ampliar", () => {
  assert.equal(validateReleaseSourceDimensions(1240, 698), null);
  assert.deepEqual(releaseOutputDimensions(1240, 698), { width: 1240, height: 698 });
});

test("reduz artes grandes para 1920 × 1080", () => {
  assert.deepEqual(releaseOutputDimensions(3840, 2160), { width: 1920, height: 1080 });
});
