-- Garante linha em public.users ao criar conta no Auth (útil quando não há sessão imediata, ex.: confirmação de email).
-- Cadastros públicos: aprovado = false. Usuários criados pelo admin continuam sendo atualizados pelo upsert do painel (aprovado true).
--
-- IMPORTANTE (SQL Editor do Supabase):
-- Se aparecer "Problema potencial detectado" / "operações destrutivas", é por causa do DROP TRIGGER abaixo.
-- Isso é normal para recriar o trigger com segurança — use "Execute esta consulta" se for intencional.
--
-- Rode ANTES a migration que adiciona a coluna `aprovado` em public.users (20250414000000_users_aprovado.sql).
--
CREATE OR REPLACE FUNCTION public.sync_users_row_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, nome, email, role, aprovado, created_at)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data ->> 'nome'), ''), '(sem nome)'),
    LOWER(TRIM(COALESCE(NEW.email, ''))),
    'assistente',
    FALSE,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_sync_users ON auth.users;
CREATE TRIGGER on_auth_user_created_sync_users
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_users_row_from_auth();
