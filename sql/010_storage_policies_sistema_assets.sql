-- 010: Policies de storage para o bucket sistema-assets
-- Execute no Supabase Dashboard > SQL Editor
-- Permite que usuários autenticados façam upload, update e delete
-- O bucket já deve ser público (leitura pública configurada no dashboard)

-- INSERT para usuários autenticados
CREATE POLICY IF NOT EXISTS "authenticated can upload sistema-assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'sistema-assets');

-- UPDATE para usuários autenticados
CREATE POLICY IF NOT EXISTS "authenticated can update sistema-assets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'sistema-assets');

-- DELETE para usuários autenticados
CREATE POLICY IF NOT EXISTS "authenticated can delete sistema-assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'sistema-assets');

-- SELECT público (leitura sem autenticação)
CREATE POLICY IF NOT EXISTS "public can read sistema-assets"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'sistema-assets');
