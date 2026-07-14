"use client";

import { useEffect } from "react";

const CSS = [
  "color: #FF5E00; font-size: 24px; font-weight: bold; font-family: monospace;",
  "color: #A84300; font-size: 12px; font-family: monospace;",
  "color: #00A3FF; font-size: 11px; font-family: monospace;",
  "color: #666; font-size: 10px; font-family: monospace;",
];

const MSG = [
  "",
  "🧱 ORANGE BRICK — Portal de notícias de games",
  "───────────────────────────────────────",
  "",
  "  Feito por humanos, pra humanos.",
  "  Se você leu isso, mande um print pra gente no Twitter.",
  "  Ou não. Mas se mandar, a gente responde.",
  "",
  "  ⎧ GLITCH HARDWARE ⎫",
  "  ⎩   CODE CULTURE  ⎭",
  "",
  "  Quer trampar com a gente?",
  "  manda um email com o assunto: 'QUERO QUEBRAR TIJOLO'",
  "",
  "───────────────────────────────────────",
  "  v2.0-beta — Build " + new Date().getFullYear(),
  "",
];

export function useConsoleEasterEgg() {
  useEffect(() => {
    console.log("%c" + MSG.join("\n"), CSS.join(""));
    console.log(
      "%c🔧 Pssiu... se você chegou até aqui, tem um cookie esperando. 🍪",
      "color: #FF5E00; font-size: 11px; font-style: italic;"
    );
  }, []);
}
