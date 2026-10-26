import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const urls = [
    "https://i.ytimg.com/vi/fT6TIXnmv-s/maxresdefault.jpg",
    "https://cdn.mos.cms.futurecdn.net/2HgroqX8omGogABFsnoJS9.jpg",
    "https://xboxwire.thesourcemediaassets.com/sites/2/2026/10/FFVIIRIG_Keyart_1920x1080-97fc8220bcf39e331423.jpg?v=2",
    "https://assets.nintendo.com/image/upload/q_auto/f_auto/store/software/switch2/70010000102602/1572ee453b3f974417a869e508c1fbf10b25776c3ee28d05087d19467e981d6e",
    "https://assets.nintendo.com/image/upload/q_auto/f_auto/store/software/switch2/70010000102602/128fb92f79d050f5ac99797f9e1902ca974b15fa59471a27f3a4c81b230f0d13",
    "https://i.ytimg.com/vi/qgJBFa952mY/maxresdefault.jpg",
  ];
  const { data, error } = await supabase.from("editorial_images").select("*").in("public_url", urls);
  console.log(error, JSON.stringify(data, null, 2));
  const { data: bySource } = await supabase.from("editorial_images").select("public_url,source_url,width,height").in("source_url", urls);
  console.log("BY SOURCE:", JSON.stringify(bySource, null, 2));
}
run();
