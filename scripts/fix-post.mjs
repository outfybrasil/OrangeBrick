import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: "../.env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const blocks = [
  {
    id: "intro",
    type: "text",
    content:
      "A Justiça brasileira deu uma lição na **Microsoft**. Um consumidor do **Rio de Janeiro** teve a conta **Xbox** invadida — mesmo com autenticação em dois fatores ativada — e, ao pedir ajuda ao suporte oficial, ouviu que a única solução era criar um perfil novo e **recomprar todos os jogos digitais** que já tinha. Em vez de aceitar, ele processou a empresa sozinho, sem advogado. E venceu.",
  },
  {
    id: "img-microsoft",
    type: "image",
    url: "https://images.unsplash.com/photo-1737922342275-71bab46ace83?auto=format&fit=crop&w=1200&q=80",
    alt: "Prédio da Microsoft com o logo da empresa no topo, representando a gigante de tecnologia que foi derrotada na Justiça brasileira",
    caption:
      "Sede da Microsoft: a empresa foi condenada a restaurar a conta e a biblioteca digital de um consumidor brasileiro.",
  },
  {
    id: "detalhes",
    type: "text",
    content:
      "## O que aconteceu\n\nO usuário, conhecido no **Reddit** como **Ordo_Liberal**, relatou que o suporte da **Microsoft** confirmou o acesso não autorizado, mas informou que as informações de segurança haviam sido alteradas pelo invasor e que a conta seria mantida bloqueada permanentemente. Como solução, orientaram que ele criasse uma nova conta e **comprasse novamente cada jogo**.\n\nInconformado, ele recorreu ao **Juizado Especial Cível do Rio de Janeiro** — que permite ações sem advogado para causas de até 20 salários mínimos. A sentença foi publicada em julho de 2026 e determina:\n\n- **Desbloqueio da conta** e restauração de toda a biblioteca digital em até 15 dias\n- **Multa diária de R$ 150** em caso de descumprimento (limitada a R$ 1.500)\n- **Indenização de R$ 2.000** por danos morais\n\nO juiz destacou que \"a perda do acesso à conta e aos jogos adquiridos ao longo dos anos representa um prejuízo que vai além do material\" e classificou a orientação da **Microsoft** como \"solução inadequada e desproporcional\".",
  },
  {
    id: "img-setup",
    type: "image",
    url: "https://images.pexels.com/photos/7858743/pexels-photo-7858743.jpeg?auto=compress&cs=tinysrgb&w=1200",
    alt: "Setup gamer com PC, monitor widescreen e cadeira ergonômica iluminado por luzes neon, representando o ecossistema de jogos digitais afetado pela disputa",
    caption:
      "O ecossistema de jogos digitais: perder a conta significa perder anos de compras e centenas de jogos.",
  },
  {
    id: "contexto",
    type: "text",
    content:
      "## Por que isso importa\n\nO caso é mais um alerta sobre os riscos do modelo de **propriedade digital**. Diferente do disco físico, a compra digital é na prática uma **licença de uso** atrelada à conta — e perder o acesso ao perfil significa perder tudo que foi comprado ao longo de anos.\n\nA decisão tem **alcance individual** (vale para este processo específico, sem criar precedente vinculante) e a **Microsoft** ainda pode recorrer. Mas o recado do Judiciário brasileiro é claro: os **termos de serviço** não estão acima do **Código de Defesa do Consumidor**.\n\n---\n\n**Fonte:** [Hardware.com.br](https://www.hardware.com.br/noticias/microsoft-tera-restaurar-conta-xbox-biblioteca-digital/) • [Adrenaline](https://www.adrenaline.com.br/microsoft/brasileiro-vence-microsoft-conta-xbox-biblioteca-digital/) • [Omelete](https://www.omelete.com.br/games/microsoft-perde-processo-contra-brasileiro-conta-de-xbox)",
  },
];

async function main() {
  const { error } = await supabase
    .from("posts")
    .update({
      body: JSON.stringify(blocks),
      updated_at: new Date().toISOString(),
    })
    .eq("slug", "brasileiro-vence-microsoft-justica-conta-xbox-biblioteca-digital");

  if (error) {
    console.error("Erro:", error.message);
    process.exit(1);
  }

  console.log("Post atualizado com sucesso");
}

main();
