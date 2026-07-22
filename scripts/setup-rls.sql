-- Configurar RLS para posts
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Permitir admins verem todos os posts (inclusive não publicados)
DROP POLICY IF EXISTS "Admin pode SELECT em posts" ON posts;
CREATE POLICY "Admin pode SELECT em posts" ON posts
  FOR SELECT
  USING (auth.jwt() -> 'user_metadata' ->> 'is_admin' = 'true');

-- Permitir admins inserirem posts
DROP POLICY IF EXISTS "Admin pode INSERT em posts" ON posts;
CREATE POLICY "Admin pode INSERT em posts" ON posts
  FOR INSERT
  WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'is_admin' = 'true');

-- Permitir admins atualizarem posts
DROP POLICY IF EXISTS "Admin pode UPDATE em posts" ON posts;
CREATE POLICY "Admin pode UPDATE em posts" ON posts
  FOR UPDATE
  USING (auth.jwt() -> 'user_metadata' ->> 'is_admin' = 'true');

-- Permitir admins deletarem posts
DROP POLICY IF EXISTS "Admin pode DELETE em posts" ON posts;
CREATE POLICY "Admin pode DELETE em posts" ON posts
  FOR DELETE
  USING (auth.jwt() -> 'user_metadata' ->> 'is_admin' = 'true');

-- Configurar RLS para contact_submissions
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode enviar contato (anon)
DROP POLICY IF EXISTS "Public pode INSERT em contact_submissions" ON contact_submissions;
CREATE POLICY "Public pode INSERT em contact_submissions" ON contact_submissions
  FOR INSERT
  WITH CHECK (true);

-- Só admin pode ver submissions
DROP POLICY IF EXISTS "Admin pode SELECT em contact_submissions" ON contact_submissions;
CREATE POLICY "Admin pode SELECT em contact_submissions" ON contact_submissions
  FOR SELECT
  USING (auth.jwt() -> 'user_metadata' ->> 'is_admin' = 'true');
