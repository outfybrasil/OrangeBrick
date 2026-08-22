import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const postId = "37f996ae-8a5a-4e89-82d3-add882a5f4e8";

const images = [
  {
    post_id: postId,
    kind: "cover",
    source_url: "https://hmjqqoselkgtfkkqrnit.supabase.co/storage/v1/object/public/post-images/editorial/mgs4-master-collection-vol-2/cover-mgs4-guns-of-the-patriots.webp",
    storage_path: "editorial/mgs4-master-collection-vol-2/cover-mgs4-guns-of-the-patriots.webp",
    public_url: "https://hmjqqoselkgtfkkqrnit.supabase.co/storage/v1/object/public/post-images/editorial/mgs4-master-collection-vol-2/cover-mgs4-guns-of-the-patriots.webp",
    alt_text: "Arte de Solid Snake com bandana e Solid Eye para Metal Gear Solid 4",
    width: 1920,
    height: 1080,
    file_size: 185000,
    mime_type: "image/webp",
  },
  {
    post_id: postId,
    kind: "body",
    source_url: "https://hmjqqoselkgtfkkqrnit.supabase.co/storage/v1/object/public/post-images/editorial/mgs4-master-collection-vol-2/body-mgs4-stealth-octocamo.webp",
    storage_path: "editorial/mgs4-master-collection-vol-2/body-mgs4-stealth-octocamo.webp",
    public_url: "https://hmjqqoselkgtfkkqrnit.supabase.co/storage/v1/object/public/post-images/editorial/mgs4-master-collection-vol-2/body-mgs4-stealth-octocamo.webp",
    alt_text: "Soldado tático em operação de combate furtivo em ruínas urbanas",
    width: 1920,
    height: 1080,
    file_size: 195000,
    mime_type: "image/webp",
  },
  {
    post_id: postId,
    kind: "body",
    source_url: "https://hmjqqoselkgtfkkqrnit.supabase.co/storage/v1/object/public/post-images/editorial/mgs4-master-collection-vol-2/body-mgs-peace-walker-operations.webp",
    storage_path: "editorial/mgs4-master-collection-vol-2/body-mgs-peace-walker-operations.webp",
    public_url: "https://hmjqqoselkgtfkkqrnit.supabase.co/storage/v1/object/public/post-images/editorial/mgs4-master-collection-vol-2/body-mgs-peace-walker-operations.webp",
    alt_text: "Comandante veterano observando base militar costeira ao pôr do sol",
    width: 1920,
    height: 1080,
    file_size: 190000,
    mime_type: "image/webp",
  },
];

const { data, error } = await supabase.from("editorial_images").insert(images).select();
if (error) {
  console.error("Erro ao registrar editorial_images:", error.message);
} else {
  console.log("✅ 3 imagens registradas na tabela editorial_images com sucesso!");
}
