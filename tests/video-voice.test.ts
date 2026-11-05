import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {chooseEditorialVoice, selectVideoVoice, recordVideoVoice, EDITORIAL_VOICES} from "../src/lib/video/video-voice.mjs";

test("o automático alterna as vozes e preserva uma escolha explícita", () => {
  assert.equal(chooseEditorialVoice("auto", EDITORIAL_VOICES[0]), EDITORIAL_VOICES[1]);
  assert.equal(chooseEditorialVoice("auto", EDITORIAL_VOICES[1]), EDITORIAL_VOICES[0]);
  assert.equal(chooseEditorialVoice(EDITORIAL_VOICES[0], EDITORIAL_VOICES[0]), EDITORIAL_VOICES[0]);
});

test("um executor novo pode restaurar a última voz concluída antes de selecionar a próxima", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "reel-voice-"));
  try {
    recordVideoVoice(root, EDITORIAL_VOICES[1], "previous-completed-reel");
    assert.equal(selectVideoVoice(root, "auto"), EDITORIAL_VOICES[0]);
    recordVideoVoice(root, EDITORIAL_VOICES[0], "new-reel");
    assert.equal(selectVideoVoice(root, "auto"), EDITORIAL_VOICES[1]);
  } finally { fs.rmSync(root, {recursive:true,force:true}); }
});
