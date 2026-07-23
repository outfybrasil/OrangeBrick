import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const slug = "xbox-sales-surge-june-2026-ps5-switch-decline";
const title = "XBOX SURPREENDE COM ALTA DE 86% NAS VENDAS ENQUANTO PS5 E SWITCH 2 RECUAM";
const summary = "Em meio à desaceleração global do mercado de consoles, a linha Xbox Series registrou salto de 86% nas vendas de junho, contrastando com as quedas do PS5 e do Switch 2. Entenda os fatores por trás dessa virada.";
const category = "industry";
const authorName = "Redação";
const authorTag = "📡 Radar";
const coverImageUrl = "/images/xbox-sales-surge-2026.png";
const coverImageAlt = "Console Xbox Series X iluminado por luzes de estúdio em tom laranja e verde";

const editorialBlocks = [
  {
    id: "b1",
    type: "text",
    content: "O mercado global de videogames atravessa um período de intensa reorganização financeira em 2026. Com os custos elevados de chips de memória mantendo o preço dos aparelhos em patamares altos e gerando resistência nos consumidores, o relatório de vendas de junho trouxe uma surpresa: a linha **Xbox Series X|S** registrou uma alta de **86% no volume de unidades vendidas** em comparação ao mesmo mês do ano anterior nos Estados Unidos."
  },
  {
    id: "b2",
    type: "image",
    url: "/images/xbox-sales-surge-2026.png",
    alt: "Console Xbox Series X sob iluminação dramática de estúdio de tecnologia",
    caption: "A linha Xbox Series registrou forte alta nas vendas impulsionada pela busca de hardware antes de reajustes."
  },
  {
    id: "b3",
    type: "text",
    content: "## O contraste com a desaceleração de PlayStation 5 e Switch 2\n\nEnquanto a marca da Microsoft teve um forte desempenho quinzenal, as concorrentes apresentaram ritmos moderados. O **PlayStation 5** enfrentou uma queda de 19% em faturamento de hardware em relação ao mesmo período de 2025, sentindo o impacto acumulado de sucessivos aumentos de preço. Já o **Switch 2**, após um ciclo inicial explosivo de lançamento, teve retração de 79% em unidades comercializadas na comparação anual, entrando em uma fase prevista de estabilização.\n\nEspecialistas indicam que o salto repentino do Xbox se deve a uma base comparativa baixa no ano anterior somada à corrida de consumidores dispostos a garantir o console antes de aumentos globais programados."
  },
  {
    id: "b4",
    type: "image",
    url: "/images/hardware-market-trend-2026.png",
    alt: "Linha de montagem industrial de componentes eletrônicos e microchips de videogames",
    caption: "A escassez e o custo de semicondutores continuam pressionando toda a indústria de hardware."
  },
  {
    id: "b5",
    type: "text",
    content: "Apesar do rali isolado do Xbox, relatórios financeiros estimam que o envio global de consoles deve encolher cerca de 20% no acumulado de 2026. Analistas de mercado prevêem que uma recuperação consistente no consumo de novos aparelhos só deve ocorrer a partir de 2028.\n\n**Fonte:** [GamesIndustry.biz](https://www.gamesindustry.biz)"
  }
];

async function insertPost() {
  const postData = {
    slug,
    title,
    summary,
    category,
    author_name: authorName,
    author_tag: authorTag,
    image_url: coverImageUrl,
    image_alt: coverImageAlt,
    body: JSON.stringify(editorialBlocks),
    is_published: false,
    updated_at: new Date().toISOString()
  };

  const { data: existing } = await supabase
    .from("posts")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    const { error: updateError } = await supabase
      .from("posts")
      .update(postData)
      .eq("id", existing.id);

    if (updateError) {
      console.error(updateError);
      process.exit(1);
    }
  } else {
    const { error: insertError } = await supabase
      .from("posts")
      .insert({
        ...postData,
        published_at: new Date().toISOString()
      });

    if (insertError) {
      console.error(insertError);
      process.exit(1);
    }
  }
  console.log("SUCCESS: Rascunho da materia do Xbox criado com sucesso!");
}

insertPost();
