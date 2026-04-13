-- Corrige perfil em public.users quando o id da linha não bate com auth.users.id (mesmo email).
-- INSERT do id novo ANTES de atualizar user_managers (FK exige que o UUID exista em users).
CREATE OR REPLACE FUNCTION public.repair_user_profile_link()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_canonical text;
  r_profile public.users%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT lower(trim(email)) INTO v_email FROM auth.users WHERE id = v_uid;
  IF v_email IS NULL OR v_email = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_auth_user');
  END IF;

  SELECT * INTO r_profile FROM public.users WHERE id = v_uid LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'action', 'already_linked');
  END IF;

  SELECT * INTO r_profile FROM public.users WHERE lower(trim(email)) = v_email LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_profile_row');
  END IF;

  IF r_profile.id = v_uid THEN
    RETURN jsonb_build_object('ok', true, 'action', 'already_linked');
  END IF;

  v_canonical := v_email;

  UPDATE public.users
  SET email = '__relink_tmp_' || replace(r_profile.id::text, '-', '') || '@invalid.local'
  WHERE id = r_profile.id;

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
    v_uid,
    r_profile.nome,
    v_canonical,
    r_profile.role,
    r_profile.aprovado,
    r_profile.created_at,
    r_profile.division_id,
    r_profile.ultimo_pagamento
  );

  BEGIN
    EXECUTE 'UPDATE public.user_managers SET user_id = $1 WHERE user_id = $2'
      USING v_uid, r_profile.id;
    EXECUTE 'UPDATE public.user_managers SET manager_id = $1 WHERE manager_id = $2'
      USING v_uid, r_profile.id;
  EXCEPTION
    WHEN undefined_table THEN
      NULL;
  END;

  DELETE FROM public.users WHERE id = r_profile.id;

  RETURN jsonb_build_object('ok', true, 'action', 'relinked');
END;
$$;

REVOKE ALL ON FUNCTION public.repair_user_profile_link() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.repair_user_profile_link() TO authenticated;
