const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// 1. Carregar variáveis de ambiente de .env.local manualmente para evitar dependências
try {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) {
    throw new Error("Arquivo .env.local não encontrado na raiz do projeto.");
  }
  
  const envConfig = fs.readFileSync(envPath, "utf-8");
  const env = {};
  envConfig.split("\n").forEach((line) => {
    const parts = line.split("=");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join("=").trim().replace(/(^['"]|['"]$)/g, "");
      env[key] = value;
    }
  });

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const adminEmail = env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@orangebrick.com";
  // A senha padrão que será configurada
  const adminPassword = "SenhaAdmin123!"; 

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Erro: Variáveis do Supabase (NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY) ausentes no .env.local.");
    process.exit(1);
  }

  // 2. Inicializar cliente administrador do Supabase
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  async function createAdmin() {
    console.log(`Tentando criar o administrador com o e-mail: ${adminEmail}...`);

    const { data, error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true, // Auto-confirma o e-mail
    });

    if (error) {
      if (error.message.includes("already exists") || error.status === 422) {
        console.log(`\nℹ️  O usuário ${adminEmail} já existe na sua base de dados do Supabase.`);
        console.log("Caso tenha esquecido a senha, você pode redefini-la diretamente pelo painel do Supabase.");
      } else {
        console.error("\n❌ Erro ao criar o administrador:", error.message);
      }
    } else {
      console.log("\n✅ Administrador criado com sucesso na sua instância do Supabase!");
      console.log("----------------------------------------");
      console.log(`E-mail: ${adminEmail}`);
      console.log(`Senha: ${adminPassword}`);
      console.log("----------------------------------------");
      console.log("⚠️  IMPORTANTE: Utilize estas credenciais para logar na tela /admin/login.");
      console.log("Altere esta senha padrão após seu primeiro acesso para segurança.");
    }
  }

  createAdmin();
} catch (err) {
  console.error("Erro ao ler configurações:", err.message);
}
