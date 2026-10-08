-- Schema used by api/new-order.js and admin/index.html.
-- Existing database migrations: create_secure_revora_orders,
-- align_revora_orders_with_checkout. Safe to run again on this schema.
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  customer_name text NOT NULL CHECK (char_length(btrim(customer_name)) BETWEEN 1 AND 200),
  customer_phone text NOT NULL CHECK (char_length(btrim(customer_phone)) BETWEEN 1 AND 40),
  customer_email text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(items) = 'array'),
  total_amount numeric(12,2) NOT NULL CHECK (total_amount >= 0),
  currency text NOT NULL DEFAULT 'UAH' CHECK (currency = 'UAH'),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','confirmed','shipped','completed','cancelled')),
  delivery_city text,
  delivery_branch text,
  tracking_number text,
  notes text
);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS number text NOT NULL DEFAULT ('RV-' || gen_random_uuid()::text) UNIQUE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_type text CHECK (delivery_type IN ('branch','locker'));
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method text CHECK (payment_method IN ('cod','card'));
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.orders FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
DROP POLICY IF EXISTS orders_admin_select ON public.orders;
CREATE POLICY orders_admin_select ON public.orders FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id=(SELECT auth.uid()) AND a.active AND a.role IN ('owner','manager')));
DROP POLICY IF EXISTS orders_admin_insert ON public.orders;
CREATE POLICY orders_admin_insert ON public.orders FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id=(SELECT auth.uid()) AND a.active AND a.role IN ('owner','manager')));
DROP POLICY IF EXISTS orders_admin_update ON public.orders;
CREATE POLICY orders_admin_update ON public.orders FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id=(SELECT auth.uid()) AND a.active AND a.role IN ('owner','manager')))
WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id=(SELECT auth.uid()) AND a.active AND a.role IN ('owner','manager')));
DROP POLICY IF EXISTS orders_owner_delete ON public.orders;
CREATE POLICY orders_owner_delete ON public.orders FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id=(SELECT auth.uid()) AND a.active AND a.role='owner'));
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_created_at_idx ON public.orders (status, created_at DESC);
