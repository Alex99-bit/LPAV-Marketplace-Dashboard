CREATE TABLE IF NOT EXISTS public.stripe_accounts (
    stripe_account_id VARCHAR(255) PRIMARY KEY,
    tenant_id UUID REFERENCES public.agencies_tenants(tenant_id) ON DELETE CASCADE NOT NULL,
    account_type VARCHAR(50) DEFAULT 'express',
    charges_enabled BOOLEAN DEFAULT FALSE,
    payouts_enabled BOOLEAN DEFAULT FALSE,
    onboarding_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT unique_stripe_per_tenant UNIQUE (tenant_id)
);

CREATE TABLE IF NOT EXISTS public.installment_schedules (
    installment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.transactions_orders(order_id) ON DELETE CASCADE NOT NULL,
    installment_number INTEGER NOT NULL,
    amount_due NUMERIC(12, 2) NOT NULL,
    amount_paid NUMERIC(12, 2) DEFAULT 0,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    stripe_checkout_url TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    reminder_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT unique_installment_per_order UNIQUE (order_id, installment_number)
);

CREATE TABLE IF NOT EXISTS public.payment_reminders (
    reminder_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    installment_id UUID REFERENCES public.installment_schedules(installment_id) ON DELETE CASCADE NOT NULL,
    channel VARCHAR(50) NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    delivered BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.saas_subscriptions (
    subscription_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.agencies_tenants(tenant_id) ON DELETE CASCADE NOT NULL,
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    plan_tier VARCHAR(50) NOT NULL,
    billing_cycle VARCHAR(50) DEFAULT 'monthly',
    status VARCHAR(50) DEFAULT 'active',
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    grace_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT unique_subscription_per_tenant UNIQUE (tenant_id)
);

ALTER TABLE public.stripe_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency reads own stripe account"
ON public.stripe_accounts FOR SELECT TO authenticated
USING (tenant_id = public.get_current_user_tenant());

CREATE POLICY "Agency reads own installments"
ON public.installment_schedules FOR SELECT TO authenticated
USING (
    order_id IN (
        SELECT order_id FROM public.transactions_orders
        WHERE tenant_id = public.get_current_user_tenant()
    )
);

CREATE POLICY "Service role manages installments"
ON public.installment_schedules FOR ALL TO service_role
USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Agency reads own subscriptions"
ON public.saas_subscriptions FOR SELECT TO authenticated
USING (tenant_id = public.get_current_user_tenant());

CREATE INDEX idx_installments_order ON public.installment_schedules(order_id);
CREATE INDEX idx_installments_due_date ON public.installment_schedules(due_date) WHERE status = 'pending';
CREATE INDEX idx_saas_sub_tenant ON public.saas_subscriptions(tenant_id);
