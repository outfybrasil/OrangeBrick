const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://hmjqqoselkgtfkkqrnit.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtanFxb3NlbGtndGZra3Fybml0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDAzOTc1NiwiZXhwIjoyMDk5NjE1NzU2fQ.a3GIMLy-65tyJuOD2UppYYpq1IhPwC_QPrG8JfGlR9M"
);

async function main() {
  const { data, error } = await supabase
    .from("posts")
    .select("slug, title, summary, image_url, image_alt")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro:", error.message);
    return;
  }

  for (const p of data) {
    console.log(`=== ${p.title} ===`);
    console.log(`Summary: ${p.summary}`);
    console.log(`Image:  ${p.image_url}`);
    console.log(`Alt:    ${p.image_alt}`);
    console.log("");
  }
}

main();
