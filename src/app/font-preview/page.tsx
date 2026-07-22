import {
  Outfit,
  Playfair_Display,
  DM_Serif_Display,
  Instrument_Serif,
  Space_Grotesk,
  Plus_Jakarta_Sans,
  JetBrains_Mono,
} from "next/font/google";

const outfit = Outfit({ subsets: ["latin"], weight: ["500", "600", "700", "800", "900"] });
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["500", "600", "700", "800", "900"] });
const dmSerif = DM_Serif_Display({ subsets: ["latin"], weight: ["400"] });
const instrumentSerif = Instrument_Serif({ subsets: ["latin"], weight: ["400"] });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const jetbrains = JetBrains_Mono({ subsets: ["latin"] });

const fonts = [
  { name: "Outfit (ATUAL — heading)", font: outfit, style: "Sans-serif geométrica" },
  { name: "Playfair Display", font: playfair, style: "Serifada clássica editorial" },
  { name: "DM Serif Display", font: dmSerif, style: "Serifada elegante contraste" },
  { name: "Instrument Serif", font: instrumentSerif, style: "Serifada moderna limpa" },
  { name: "Space Grotesk (subtitle)", font: spaceGrotesk, style: "Sans grotesca" },
  { name: "Plus Jakarta Sans (body)", font: plusJakarta, style: "Sans humanista" },
  { name: "JetBrains Mono (mono)", font: jetbrains, style: "Mono" },
];

const sampleText = "Nintendo Switch 2 mantém cartuchos, mas inventa o Game-Key Card";
const sampleSub = "Sony anuncia fim definitivo de mídias físicas no PlayStation a partir de 2028";

export default function FontPreviewPage() {
  return (
    <main className="min-h-dvh bg-[#0D0E12] text-white p-8">
      <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-heading-var), Outfit, sans-serif" }}>
        Preview de Fontes — Heading
      </h1>
      <p className="text-gray-400 mb-8 font-sans text-sm">
        Comparação visual de fontes candidatas para títulos (heading). A fonte atual é <strong>Outfit</strong>.
      </p>

      <div className="grid gap-10">
        {fonts.map((f) => (
          <section key={f.name} className={`${f.font.className} border border-gray-800 rounded-lg p-6 bg-[#1C1E24]/50`}>
            <div className="flex items-baseline justify-between mb-4 border-b border-gray-700 pb-2">
              <span className="text-lg font-bold text-brand-orange">{f.name}</span>
              <span className="text-xs text-gray-500">{f.style}</span>
            </div>
            <h2 className="text-4xl font-black leading-tight mb-2">{sampleText}</h2>
            <h3 className="text-2xl font-bold leading-snug mb-2">{sampleSub}</h3>
            <h4 className="text-xl font-semibold leading-snug opacity-80">
              PlayStation 5 Pro chega com ray tracing reforçado e upscale por IA
            </h4>
            <p className="text-sm mt-4 text-gray-500">
              ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789 !@#$%*()
            </p>
          </section>
        ))}
      </div>
    </main>
  );
}
