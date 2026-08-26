import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import fs from "fs";
import path from "path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Variáveis de ambiente do Supabase não encontradas.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const artifactDir = "C:\\Users\\Teste\\.gemini\\antigravity-ide\\brain\\1259517a-ed83-45f1-a2c7-e15ce3892f3a";

const imageSources = {
  cover: path.join(artifactDir, "gamescom_onl_cover_1787676227327.jpg"),
  presenter: path.join(artifactDir, "geoff_keighley_stage_1787676246643.jpg"),
  showfloor: path.join(artifactDir, "gamescom_showfloor_1787676271037.jpg"),
};

async function uploadEditorialImage(filePath, destinationPath, altText, kind, postId = null) {
  const fileBuffer = fs.readFileSync(filePath);
  const webpBuffer = await sharp(fileBuffer)
    .resize(1920, 1080, { fit: "cover" })
    .webp({ quality: 88, effort: 5 })
    .toBuffer();

  const metadata = await sharp(webpBuffer).metadata();

  const { error: uploadError } = await supabase.storage
    .from("post-images")
    .upload(destinationPath, webpBuffer, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Erro no upload (${destinationPath}): ${uploadError.message}`);
  }

  const { data: publicData } = supabase.storage
    .from("post-images")
    .getPublicUrl(destinationPath);

  const publicUrl = publicData.publicUrl;

  const editorialRecord = {
    post_id: postId,
    kind: kind,
    source_url: publicUrl,
    storage_path: destinationPath,
    public_url: publicUrl,
    alt_text: altText,
    width: metadata.width || 1920,
    height: metadata.height || 1080,
    file_size: webpBuffer.byteLength,
    mime_type: "image/webp",
  };

  return { publicUrl, editorialRecord };
}

async function run() {
  console.log("Processando e enviando imagens para o Supabase Storage...");

  const coverUpload = await uploadEditorialImage(
    imageSources.cover,
    "editorial/gamescom-2026-opening-night-live/cover-gamescom-onl-arena.webp",
    "Palco principal iluminado da cerimônia de abertura da Gamescom Opening Night Live na arena Koelnmesse em Colônia",
    "cover"
  );

  const body1Upload = await uploadEditorialImage(
    imageSources.presenter,
    "editorial/gamescom-2026-opening-night-live/body-geoff-keighley-stage-premiere.webp",
    "Apresentador anunciando estreias mundiais no palco principal da Gamescom diante do público internacional",
    "body"
  );

  const body2Upload = await uploadEditorialImage(
    imageSources.showfloor,
    "editorial/gamescom-2026-opening-night-live/body-gamescom-showfloor-pavilions.webp",
    "Pavilhões de exposição da Gamescom 2026 com estações de teste e estandes temáticos das principais publishers",
    "body"
  );

  console.log("Uploads concluídos com sucesso!");

  const blocks = [
    {
      id: "intro-block",
      type: "text",
      content:
        "O calendário global de anúncios de videogames atinge o seu ponto mais alto hoje (25 de agosto). A **Gamescom 2026** dá o pontapé inicial em Colônia, na Alemanha, com a tradicional apresentação **Opening Night Live (ONL)**. Conduzido e produzido por **Geoff Keighley**, o espetáculo de duas horas reúne desenvolvedoras de todo o planeta para revelar trailers inéditos, atualizações de projetos aguardados e datas de estreia para a atual geração de consoles e PC.\n\nCom a indústria em um momento de consolidação tecnológica e transição de hardware — impulsionada pela chegada de novas plataformas e pela maturação dos motores gráficos como a Unreal Engine 5 —, a transmissão alemã se consolidou como a principal vitrine presencial e digital do segundo semestre. Centenas de milhares de entusiastas e profissionais do setor acompanham a abertura, que antecipa a abertura dos pavilhões da feira para o público geral até o próximo domingo.",
    },
    {
      id: "img-onl-stage",
      type: "image",
      url: body1Upload.publicUrl,
      alt: "Apresentador anunciando estreias mundiais no palco principal da Gamescom diante do público internacional",
      caption:
        "A Opening Night Live abre o evento com foco exclusivo em anúncios de grande porte e revelações de gameplay.",
    },
    {
      id: "body-reveals",
      type: "text",
      content:
        "## As grandes revelações no radar da transmissão\n\nA programação deste ano está entre as mais densas das últimas edições. Entre os destaques confirmados pela organização, a **CD Projekt RED** apresenta pela primeira vez em movimento a expansão **The Witcher 3: Songs of the Past**, desenvolvida em parceria com o estúdio **Fool's Theory** para explorar contos inéditos do universo de Geralt de Rívia antes dos próximos passos da franquia.\n\nA **Square Enix** também reservou espaço nobre para detalhar a conclusão de sua trilogia de remakes com novos vislumbres de **Final Fantasy VII: Revelation**, esclarecendo direções narrativas e mecânicas de exploração. Pelo lado do **Xbox Game Studios**, a aguardada prévia cinemática e trechos de jogabilidade de **Gears of War: E-Day** preparam o terreno para o lançamento programado para os próximos meses.\n\nOutros projetos de peso também compõem a grade de exibições, incluindo prévias de **METRO 2039** da 4A Games, novos teasers de terror psicológico com **Silent Hill: Townfall** e demonstrações de títulos que aproveitam as novas capacidades de processamento do **Nintendo Switch 2** e do **PlayStation 5**.\n\n\"O público quer ver gameplay genuíno, datas firmes e surpresas de estúdios que estão expandindo os limites da narrativa interativa. Nosso objetivo em Colônia é celebrar o trabalho das equipes de desenvolvimento com o ritmo que a comunidade espera\", destacou Geoff Keighley durante a apresentação dos preparativos do evento.",
    },
    {
      id: "img-showfloor",
      type: "image",
      url: body2Upload.publicUrl,
      alt: "Pavilhões de exposição da Gamescom 2026 com estações de teste e estandes temáticos das principais publishers",
      caption:
        "Os pavilhões da Koelnmesse abrem nos próximos dias com centenas de estações jogáveis e estandes imersivos.",
    },
    {
      id: "body-industry-context",
      type: "text",
      content:
        "## Estrutura recorde e força do evento presencial\n\nAlém do alcance massivo das transmissões via **YouTube**, **Twitch** e canais oficiais de parceiros, a Gamescom reafirma seu status de maior convenção física de jogos do mundo. A **Koelnmesse** preparou uma infraestrutura recorde para abrigar expositores de mais de 60 países.\n\nA divisão **Xbox** confirmou sua maior participação histórica na Europa, disponibilizando dezenas de estações de demonstração prática para visitantes testarem novidades de catálogo e lançamentos em primeira mão. A **Nintendo** e a **PlayStation** também marcam presença com áreas dedicadas a experiências competitivas e ativações com a comunidade de jogadores.\n\nA abertura de hoje funciona como o divisor de águas para os lançamentos do quarto trimestre e os grandes anúncios previstos para 2027. Após o encerramento da Opening Night Live, o público terá acesso aos corredores temáticos, palcos de esports e conferências de negócios entre 26 e 30 de agosto.\n\n---\n\n**Fonte:** [Gamescom Oficial](https://www.gamescom.global) • [Eurogamer](https://www.eurogamer.net) • [IGN Brasil](https://br.ign.com)",
    },
  ];

  const post = {
    slug: "gamescom-2026-abertura-opening-night-live-revelacoes-lancamentos",
    title: "GAMESCOM 2026 ABRE HOJE COM ANÚNCIOS DE THE WITCHER, GEARS E FF7",
    summary:
      "Comandada por Geoff Keighley, a Opening Night Live abre a Gamescom 2026 hoje com estreias mundiais e anúncios de grandes franquias da indústria.",
    body: JSON.stringify(blocks),
    category: "breaking",
    image_url: coverUpload.publicUrl,
    image_alt:
      "Palco monumental da Gamescom Opening Night Live na arena Koelnmesse com iluminação cênica e plateia lotada",
    author_name: "The Brick",
    author_tag: "💣 Plantão",
    is_published: false,
    published_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  console.log("Inserindo post como rascunho no Supabase...");
  const { data: postData, error: postError } = await supabase
    .from("posts")
    .insert(post)
    .select()
    .single();

  if (postError) {
    console.error("Erro ao salvar post:", postError.message);
    process.exit(1);
  }

  console.log("✅ Post salvo com sucesso como rascunho!");
  console.log("ID:", postData.id);
  console.log("Slug:", postData.slug);
  console.log("Título:", postData.title);

  // Register in editorial_images table
  const imagesToRegister = [
    { ...coverUpload.editorialRecord, post_id: postData.id },
    { ...body1Upload.editorialRecord, post_id: postData.id },
    { ...body2Upload.editorialRecord, post_id: postData.id },
  ];

  const { error: edImagesError } = await supabase
    .from("editorial_images")
    .insert(imagesToRegister);

  if (edImagesError) {
    console.error("Aviso: erro ao registrar editorial_images:", edImagesError.message);
  } else {
    console.log("✅ 3 registros criados na tabela editorial_images com sucesso!");
  }
}

run().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
