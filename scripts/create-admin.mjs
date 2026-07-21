import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.argv[2] || process.env.ADMIN_EMAIL;
const adminPassword = process.argv[3] || process.env.ADMIN_PASSWORD;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local.");
}

if (!adminEmail || !adminPassword) {
  throw new Error("Uso: npm run admin:create -- email@exemplo.com senha");
}

if (adminPassword.length < 14) {
  throw new Error("ADMIN_PASSWORD deve ter pelo menos 14 caracteres.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: users, error: listError } = await supabase.auth.admin.listUsers();
if (listError) throw listError;

const existing = users.users.find((user) => user.email === adminEmail);
if (existing) {
  const { error } = await supabase.auth.admin.updateUserById(existing.id, {
    password: adminPassword,
    email_confirm: true,
    app_metadata: { ...existing.app_metadata, is_admin: true },
  });
  if (error) throw error;
} else {
  const { error } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    app_metadata: { is_admin: true },
  });
  if (error) throw error;
}

console.log(`Administrador configurado: ${adminEmail}`);
