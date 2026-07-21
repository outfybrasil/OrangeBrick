import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('.env.local não encontrado ou faltando SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const POLLINATIONS_BASE = 'https://image.pollinations.ai/prompt';

async function generateImage(prompt) {
  console.log(`Gerando imagem: "${prompt.slice(0, 80)}..."`);
  const encoded = encodeURIComponent(prompt);
  const url = `${POLLINATIONS_BASE}/${encoded}?width=1024&height=1024&nologo=true&seed=${Date.now()}`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) throw new Error(`HTTP ${res.status} ao acessar Pollinations`);
  const buf = await res.arrayBuffer();
  if (buf.byteLength < 1000) throw new Error('Imagem retornada muito pequena');
  console.log(`  -> OK (${(buf.byteLength / 1024).toFixed(0)}KB)`);
  return url;
}

async function main() {
  const { data: post, error } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', 'bethesda-roadmap-elder-scrolls-6-fallout-5-remasters')
    .single();

  if (error || !post) {
    console.error('Post não encontrado:', error?.message);
    process.exit(1);
  }

  console.log('Post:', post.id, post.title);

  const coverPrompt = `Imagem fotorrealista de uma mesa de escritório de desenvolvimento de jogos com plantas de design de RPG espalhadas, um monitor mostrando o mapa de Tamriel e outro com o logotipo da Bethesda ao fundo. Estilo fotografia editorial, iluminação dramatica, alta qualidade, resolução 4K. Mostrar ambiente de estúdio de games com referências a Elder Scrolls e Fallout. Sem texto na imagem.`;

  const body1Prompt = `Imagem fotorrealista de um mostrador medieval com um pergaminho antigo sendo desenrolado, revelando um mapa fantastico com castelos e florestas, representando The Elder Scrolls VI. Estilo fotografia editorial, iluminação dramatica, alta qualidade, resolução 4K. Sem texto na imagem.`;

  const body2Prompt = `Imagem fotorrealista de um capacete de soldado enferrujado e danificado posado sobre uma pilha de documentos de demissão e fitas cassete quebradas, simbolizando o fim de uma era e cortes na indústria. Estilo fotografia editorial, iluminação dramatica, alta qualidade, resolução 4K. Sem texto na imagem.`;

  console.log('\n--- Gerando imagens (isso pode levar alguns minutos) ---\n');

  const coverUrl = await generateImage(coverPrompt);
  console.log('  ✔ Capa gerada');

  const body1Url = await generateImage(body1Prompt);
  console.log('  ✔ Imagem 1 gerada');

  const body2Url = await generateImage(body2Prompt);
  console.log('  ✔ Imagem 2 gerada');

  const blocks = JSON.parse(post.body);
  const updatedBlocks = blocks.map((b) => {
    if (b.id === 'img-1' && b.type === 'image') {
      return { ...b, url: body1Url, alt: 'Pergaminho medieval com mapa fantastico sendo desenrolado, representando o aguardado The Elder Scrolls VI. O novo jogo roda na Creation Engine 3 e é a prioridade máxima da Bethesda.' };
    }
    if (b.id === 'img-2' && b.type === 'image') {
      return { ...b, url: body2Url, alt: 'Capacete de soldado danificado sobre documentos de demissão, simbolizando o custo das demissões em massa no Xbox que afetaram Bethesda, id Software, ZeniMax Online e Obsidian.' };
    }
    return b;
  });

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('posts')
    .update({
      image_url: coverUrl,
      image_alt: 'Mesa de estúdio de desenvolvimento com mapas de RPG e monitores mostrando Tamriel e o logo da Bethesda. O estúdio passa pela maior reestruturação da história do Xbox.',
      body: JSON.stringify(updatedBlocks),
      updated_at: now,
    })
    .eq('id', post.id);

  if (updateError) {
    console.error('Erro ao atualizar:', updateError.message);
    process.exit(1);
  }

  console.log('\n Post atualizado com sucesso!');
}

main();
