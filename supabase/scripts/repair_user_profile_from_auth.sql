-- =============================================================================
-- Reparo: mesmo email no Auth e em public.users, mas UUID diferente.
-- Ordem: 1) libera email na linha antiga  2) INSERT id novo (existe p/ FK)
--         3) reaponta user_managers  4) REMOVE linha antiga
--
-- Supabase → SQL Editor → troque só v_email abaixo.
-- =============================================================================

DO $$
DECLARE
  v_email text := 'eduardo_amorim21@hotmail.com';
  v_new uuid;
  v_canonical text;
  r public.users%ROWTYPE;
BEGIN
  SELECT id INTO v_new
  FROM auth.users
  WHERE lower(trim(email)) = lower(trim(v_email))
  LIMIT 1;

  IF v_new IS NULL THEN
    RAISE EXCEPTION 'Nenhum usuário em auth.users com este email.';
  END IF;

  SELECT * INTO r FROM public.users
  WHERE lower(trim(email)) = lower(trim(v_email))
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.users (id, nome, email, role, aprovado, created_at)
    SELECT
      au.id,
      COALESCE(NULLIF(TRIM(au.raw_user_meta_data ->> 'nome'), ''), '(sem nome)'),
      lower(trim(au.email)),
      'assistente',
      TRUE,
      NOW()
    FROM auth.users au
    WHERE au.id = v_new;
    RETURN;
  END IF;

  IF r.id = v_new THEN
    RETURN;
  END IF;

  v_canonical := lower(trim(r.email));

  -- Libera o email (unique) e mantém a linha antiga até reapontar FKs
  UPDATE public.users
  SET email = '__relink_tmp_' || replace(r.id::text, '-', '') || '@invalid.local'
  WHERE id = r.id;

  INSERT INTO public.users (
    id,
    nome,
    email,
    role,
    aprovado,
    created_at,
    division_id,
    ultimo_pagamento
  )
  VALUES (
    v_new,
    r.nome,
    v_canonical,
    r.role,
    r.aprovado,
    r.created_at,
    r.division_id,
    r.ultimo_pagamento
  );

  BEGIN
    UPDATE public.user_managers SET user_id = v_new WHERE user_id = r.id;
    UPDATE public.user_managers SET manager_id = v_new WHERE manager_id = r.id;
  EXCEPTION
    WHEN undefined_table THEN
      NULL;
  END;

  DELETE FROM public.users WHERE id = r.id;
END $$;
