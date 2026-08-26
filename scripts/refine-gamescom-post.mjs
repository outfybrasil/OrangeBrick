import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Variáveis de ambiente do Supabase não encontradas.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const slug = "gamescom-2026-abertura-opening-night-live-revelacoes-lancamentos";

const { data: post, error: fetchError } = await supabase
  .from("posts")
  .select("*")
  .eq("slug", slug)
  .single();

if (fetchError) {
  console.error("Erro ao buscar post:", fetchError.message);
  process.exit(1);
}

const blocks = JSON.parse(post.body);

// Update block 5 (body-industry-context) to include open community debate invitation
blocks[4].content =
  "## Estrutura recorde e força do evento presencial\n\nAlém do alcance massivo das transmissões via **YouTube**, **Twitch** e canais oficiais de parceiros, a Gamescom reafirma seu status de maior convenção física de jogos do mundo. A **Koelnmesse** preparou uma infraestrutura recorde para abrigar expositores de mais de 60 países.\n\nA divisão **Xbox** confirmou sua maior participação histórica na Europa, disponibilizando dezenas de estações de demonstração prática para visitantes testarem novidades de catálogo e lançamentos em primeira mão. A **Nintendo** e a **PlayStation** também marcam presença com áreas dedicadas a experiências competitivas e ativações com a comunidade de jogadores.\n\nA abertura de hoje funciona como o divisor de águas para os lançamentos do quarto trimestre e os grandes anúncios previstos para 2027. Após o encerramento da Opening Night Live, o público terá acesso aos corredores temáticos, palcos de esports e conferências de negócios entre 26 e 30 de agosto.\n\nQual dessas revelações tem mais potencial para definir o resto do ano: a nova expansão de The Witcher 3, o encerramento do remake de Final Fantasy VII ou o retorno bruto de Gears of War? Deixe sua reação de Hype ou Salty abaixo e participe do debate no Brickboard.\n\n---\n\n**Fonte:** [Gamescom Oficial](https://www.gamescom.global) • [Eurogamer](https://www.eurogamer.net) • [IGN Brasil](https://br.ign.com)";

const { data: updatedPost, error: updateError } = await supabase
  .from("posts")
  .update({
    body: JSON.stringify(blocks),
    updated_at: new Date().toISOString(),
  })
  .eq("id", post.id)
  .select()
  .single();

if (updateError) {
  console.error("Erro ao atualizar post:", updateError.message);
  process.exit(1);
}

console.log("✅ Post refinado com sucesso!");
