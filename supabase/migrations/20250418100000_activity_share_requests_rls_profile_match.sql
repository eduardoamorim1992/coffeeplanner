-- Corrige RLS quando public.users.id ≠ auth.uid() (perfil ligado pelo mesmo email do JWT).
-- Sem isso, INSERT falha com "violates row-level security policy".

DROP POLICY IF EXISTS "activity_share_select_own" ON public.activity_share_requests;
DROP POLICY IF EXISTS "activity_share_insert_as_requester" ON public.activity_share_requests;
DROP POLICY IF EXISTS "activity_share_update_target" ON public.activity_share_requests;
DROP POLICY IF EXISTS "activity_share_delete_requester" ON public.activity_share_requests;

-- Linha da tabela users que corresponde à sessão (id = auth.uid() OU email = JWT)
CREATE OR REPLACE FUNCTION public.activity_share_is_me(profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = profile_id
      AND (
        u.id = auth.uid()
        OR (
          auth.jwt() ->> 'email' IS NOT NULL
          AND lower(trim(u.email)) = lower(trim(auth.jwt() ->> 'email'))
        )
      )
  );
$$;

COMMENT ON FUNCTION public.activity_share_is_me(uuid) IS
  'true se profile_id é o usuário logado (auth.uid() ou mesma linha users por email do JWT).';

GRANT EXECUTE ON FUNCTION public.activity_share_is_me(uuid) TO authenticated;

CREATE POLICY "activity_share_select_own"
  ON public.activity_share_requests
  FOR SELECT
  TO authenticated
  USING (
    public.activity_share_is_me(requester_id)
    OR public.activity_share_is_me(target_id)
  );

CREATE POLICY "activity_share_insert_as_requester"
  ON public.activity_share_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    requester_id <> target_id
    AND public.activity_share_is_me(requester_id)
  );

CREATE POLICY "activity_share_update_target"
  ON public.activity_share_requests
  FOR UPDATE
  TO authenticated
  USING (public.activity_share_is_me(target_id))
  WITH CHECK (public.activity_share_is_me(target_id));

CREATE POLICY "activity_share_delete_requester"
  ON public.activity_share_requests
  FOR DELETE
  TO authenticated
  USING (public.activity_share_is_me(requester_id));
