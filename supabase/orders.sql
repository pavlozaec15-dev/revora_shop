-- REVORA: захищене сховище замовлень
-- Виконайте один раз у Supabase SQL Editor.
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL UNIQUE,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_city text,
  delivery_type text,
  warehouse text,
  payment_method text,
  comment text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric(12,2) NOT NULL CHECK (total >= 0),
  status text NOT NULL DEFAULT 'Прийнято',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.orders FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.orders TO authenticated;

DROP POLICY IF EXISTS "Active admins can read orders" ON public.orders;
CREATE POLICY "Active admins can read orders"
ON public.orders FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users AS a
    WHERE a.user_id = (SELECT auth.uid())
      AND a.active = true
      AND a.role IN ('owner', 'manager', 'editor')
  )
);

-- Запис замовлень з публічного браузера заборонений.
-- Серверний API підключимо окремо через секретний ключ у Vercel.
