-- 1. TABLA DE PAQUETES TURÍSTICOS (FORMATO FLYER VERTICAL 3:4)
CREATE TABLE public.travel_packages (
    package_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.agencies_tenants(tenant_id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    region VARCHAR(150) NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'MXN',
    url_flyer_storage TEXT NOT NULL,
    url_thumbnail_storage TEXT NOT NULL,
    has_coordinator BOOLEAN DEFAULT FALSE,
    publication_status VARCHAR(50) DEFAULT 'draft',
    departure_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2. TABLA DE ÓRDENES Y TRANSACCIONES FINANCIERAS
CREATE TABLE public.transactions_orders (
    order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.agencies_tenants(tenant_id) ON DELETE CASCADE NOT NULL,
    stripe_checkout_session_id VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    remaining_balance NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'MXN',
    platform_commission_fee NUMERIC(12, 2) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'pending',
    next_payment_due TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 3. TABLA DE PERFILAMIENTO Y CACHÉ SEGMENTADO DE IA
CREATE TABLE public.user_recommendation_profiles (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    cluster_interests_hash VARCHAR(64) NOT NULL,
    preferred_destinations TEXT[],
    target_budget_range VARCHAR(50),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE public.cached_itineraries (
    cache_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID REFERENCES public.travel_packages(package_id) ON DELETE CASCADE NOT NULL,
    cluster_interests_hash VARCHAR(64) NOT NULL,
    itinerary_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT unique_package_cluster_cache UNIQUE (package_id, cluster_interests_hash)
);

-- 4. TABLA DE LOGS DE COMPORTAMIENTO CONDUCTUAL
CREATE TABLE public.user_behavior_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_tracker_id UUID,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    package_id UUID REFERENCES public.travel_packages(package_id) ON DELETE CASCADE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);
