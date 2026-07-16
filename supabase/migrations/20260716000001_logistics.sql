CREATE TABLE IF NOT EXISTS public.traveler_documents (
    document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.transactions_orders(order_id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS public.rooming_lists (
    rooming_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.transactions_orders(order_id) ON DELETE CASCADE NOT NULL,
    generated_by UUID REFERENCES public.profiles(id) NOT NULL,
    file_url TEXT NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS public.travel_incidents (
    incident_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.transactions_orders(order_id) ON DELETE CASCADE NOT NULL,
    reported_by UUID REFERENCES public.profiles(id) NOT NULL,
    severity VARCHAR(50) DEFAULT 'medium',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'open',
    resolution TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    resolved_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.traveler_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooming_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own documents"
ON public.traveler_documents FOR ALL TO authenticated
USING (user_id = auth.uid() OR order_id IN (
    SELECT order_id FROM public.transactions_orders
    WHERE tenant_id = public.get_current_user_tenant()
))
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Agency manages rooming lists"
ON public.rooming_lists FOR ALL TO authenticated
USING (order_id IN (
    SELECT order_id FROM public.transactions_orders
    WHERE tenant_id = public.get_current_user_tenant()
))
WITH CHECK (order_id IN (
    SELECT order_id FROM public.transactions_orders
    WHERE tenant_id = public.get_current_user_tenant()
));

CREATE POLICY "Agency and traveler manage incidents"
ON public.travel_incidents FOR ALL TO authenticated
USING (
    reported_by = auth.uid()
    OR order_id IN (
        SELECT order_id FROM public.transactions_orders
        WHERE tenant_id = public.get_current_user_tenant()
    )
)
WITH CHECK (TRUE);

CREATE INDEX idx_traveler_docs_order ON public.traveler_documents(order_id);
CREATE INDEX idx_rooming_order ON public.rooming_lists(order_id);
CREATE INDEX idx_incidents_order ON public.travel_incidents(order_id);
