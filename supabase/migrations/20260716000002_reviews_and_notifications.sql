CREATE TABLE IF NOT EXISTS public.package_reviews (
    review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID REFERENCES public.travel_packages(package_id) ON DELETE CASCADE NOT NULL,
    order_id UUID REFERENCES public.transactions_orders(order_id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    comment TEXT,
    status VARCHAR(50) DEFAULT 'published',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT unique_review_per_user_order UNIQUE (user_id, order_id)
);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
    pref_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    email_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    email_payment_reminders BOOLEAN DEFAULT TRUE,
    email_chat_notifications BOOLEAN DEFAULT TRUE,
    email_marketing BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT unique_prefs_per_user UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS public.notification_delivery_log (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID REFERENCES public.notifications(notification_id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    channel VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'sent',
    external_id VARCHAR(255),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE public.package_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_delivery_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads published reviews"
ON public.package_reviews FOR SELECT TO anon, authenticated
USING (status = 'published');

CREATE POLICY "Users create own reviews"
ON public.package_reviews FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own preferences"
ON public.notification_preferences FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users read own delivery log"
ON public.notification_delivery_log FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Service role manages delivery log"
ON public.notification_delivery_log FOR ALL TO service_role
USING (TRUE) WITH CHECK (TRUE);

CREATE INDEX idx_reviews_package ON public.package_reviews(package_id) WHERE status = 'published';
CREATE INDEX idx_reviews_user ON public.package_reviews(user_id);
CREATE INDEX idx_notif_prefs_user ON public.notification_preferences(user_id);

CREATE OR REPLACE FUNCTION public.auto_create_notification_prefs()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notification_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_auto_create_notification_prefs ON public.profiles;
CREATE TRIGGER tr_auto_create_notification_prefs
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_create_notification_prefs();

CREATE OR REPLACE FUNCTION public.inject_post_trip_review_request()
RETURNS void AS $$
BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, metadata)
    SELECT
        o.user_id,
        'payment_received',
        '¿Cómo fue tu viaje?',
        'Comparte tu experiencia sobre ' || tp.title,
        jsonb_build_object('package_id', tp.package_id, 'order_id', o.order_id)
    FROM public.transactions_orders o
    JOIN public.travel_packages tp ON tp.package_id = (
        SELECT package_id FROM public.travel_packages
        WHERE tenant_id = o.tenant_id
        AND departure_date <= TIMEZONE('utc', NOW()) - INTERVAL '24 hours'
        AND departure_date > TIMEZONE('utc', NOW()) - INTERVAL '25 hours'
        LIMIT 1
    )
    WHERE o.payment_status = 'paid'
    AND NOT EXISTS (
        SELECT 1 FROM public.package_reviews pr
        WHERE pr.order_id = o.order_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
