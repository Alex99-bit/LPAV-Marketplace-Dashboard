-- Cancellation, refund and fee ledger for the intermediary marketplace model.

ALTER TABLE public.transactions_orders
  ADD COLUMN IF NOT EXISTS package_total_amount NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_percent NUMERIC(5, 4) NOT NULL DEFAULT 0.20,
  ADD COLUMN IF NOT EXISTS payment_processing_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_processing_fee_iva NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_fee_actual NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS cancellation_status VARCHAR(30) NOT NULL DEFAULT 'not_requested',
  ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(50),
  ADD COLUMN IF NOT EXISTS cancellation_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_penalty NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS agency_debit NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS policy_version VARCHAR(30) NOT NULL DEFAULT '2026-09-29';

UPDATE public.transactions_orders
SET package_total_amount = COALESCE(package_total_amount, total_amount),
    paid_amount = CASE WHEN paid_amount = 0 THEN total_amount ELSE paid_amount END
WHERE package_total_amount IS NULL OR paid_amount = 0;

ALTER TABLE public.transactions_orders
  ALTER COLUMN package_total_amount SET DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.order_cancellation_requests (
  cancellation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.transactions_orders(order_id) ON DELETE CASCADE,
  requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason VARCHAR(50) NOT NULL,
  days_before_departure INTEGER,
  policy_version VARCHAR(30) NOT NULL,
  paid_amount NUMERIC(12, 2) NOT NULL,
  penalty_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  refund_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  agency_debit NUMERIC(12, 2) NOT NULL DEFAULT 0,
  stripe_refund_id VARCHAR(255),
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  processed_at TIMESTAMPTZ,
  UNIQUE (order_id, status)
);

CREATE TABLE IF NOT EXISTS public.order_refunds (
  refund_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.transactions_orders(order_id) ON DELETE CASCADE,
  cancellation_id UUID REFERENCES public.order_cancellation_requests(cancellation_id) ON DELETE SET NULL,
  stripe_refund_id VARCHAR(255) NOT NULL UNIQUE,
  amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  reason VARCHAR(50) NOT NULL,
  processing_fee_refunded NUMERIC(12, 2) NOT NULL DEFAULT 0,
  agency_debit NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS public.agency_financial_reserves (
  tenant_id UUID PRIMARY KEY REFERENCES public.agencies_tenants(tenant_id) ON DELETE CASCADE,
  reserve_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  negative_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE public.order_cancellation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_financial_reserves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their cancellation requests"
  ON public.order_cancellation_requests FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.transactions_orders o
    WHERE o.order_id = order_cancellation_requests.order_id
      AND o.user_id = auth.uid()
  ));

CREATE POLICY "Users can view their refunds"
  ON public.order_refunds FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.transactions_orders o
    WHERE o.order_id = order_refunds.order_id
      AND o.user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_cancellation_requests_order
  ON public.order_cancellation_requests(order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_refunds_order
  ON public.order_refunds(order_id, created_at DESC);
