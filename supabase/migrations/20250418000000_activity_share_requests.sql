-- Solicitações para ver atividades de outro usuário (aprovado pelo alvo).
CREATE TABLE IF NOT EXISTS public.activity_share_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CONSTRAINT activity_share_requests_no_self CHECK (requester_id <> target_id),
  CONSTRAINT activity_share_requests_unique_pair UNIQUE (requester_id, target_id)
);

CREATE INDEX IF NOT EXISTS idx_activity_share_requests_target
  ON public.activity_share_requests (target_id);

CREATE INDEX IF NOT EXISTS idx_activity_share_requests_requester
  ON public.activity_share_requests (requester_id);

CREATE INDEX IF NOT EXISTS idx_activity_share_requests_requester_status
  ON public.activity_share_requests (requester_id, status);

COMMENT ON TABLE public.activity_share_requests IS
  'Pedido de visualização de atividades: requester pede; target aprova ou rejeita.';

ALTER TABLE public.activity_share_requests ENABLE ROW LEVEL SECURITY;

-- SELECT: só quem pediu ou quem foi convidado
CREATE POLICY "activity_share_select_own"
  ON public.activity_share_requests
  FOR SELECT
  TO authenticated
  USING (
    requester_id = auth.uid()
    OR target_id = auth.uid()
  );

-- INSERT: só como solicitante (requester = auth.uid())
CREATE POLICY "activity_share_insert_as_requester"
  ON public.activity_share_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    requester_id = auth.uid()
    AND requester_id <> target_id
  );

-- UPDATE: só o alvo (quem autoriza)
CREATE POLICY "activity_share_update_target"
  ON public.activity_share_requests
  FOR UPDATE
  TO authenticated
  USING (target_id = auth.uid())
  WITH CHECK (target_id = auth.uid());

-- DELETE: quem pediu pode remover (ex.: tentar de novo após rejeição)
CREATE POLICY "activity_share_delete_requester"
  ON public.activity_share_requests
  FOR DELETE
  TO authenticated
  USING (requester_id = auth.uid());
