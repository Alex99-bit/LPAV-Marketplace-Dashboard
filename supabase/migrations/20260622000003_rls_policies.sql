-- HABILITAR RLS EN TODAS LAS TABLAS OPERATIVAS
ALTER TABLE public.agencies_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_roles_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions_orders ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS PARA AGENCIES_TENANTS
CREATE POLICY "SuperAdmins ven todos los tenants" ON public.agencies_tenants
    FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'SuperAdmin');

CREATE POLICY "Agencias ven su propio registro tenant" ON public.agencies_tenants
    FOR SELECT TO authenticated USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- POLÍTICAS PARA CUSTOM_ROLES_PERMISSIONS
CREATE POLICY "Usuarios autenticados ven roles de su tenant" ON public.custom_roles_permissions
    FOR SELECT TO authenticated
    USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admins gestionan roles de su propio tenant" ON public.custom_roles_permissions
    FOR ALL TO authenticated
    USING (
        tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()) AND
        (SELECT role_name FROM public.profiles WHERE id = auth.uid()) = 'Agency_Admin'
    )
    WITH CHECK (
        tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()) AND
        (SELECT role_name FROM public.profiles WHERE id = auth.uid()) = 'Agency_Admin'
    );

-- POLÍTICAS PARA TRAVEL_PACKAGES (CATÁLOGO PÚBLICO / MUTACIÓN PRIVADA)
CREATE POLICY "Cualquiera puede ver paquetes publicados" ON public.travel_packages
    FOR SELECT USING (publication_status IN ('published', 'concluded'));

CREATE POLICY "Colaboradores mutan catálogo de su propio tenant" ON public.travel_packages
    FOR ALL TO authenticated
    USING (
        tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()) AND
        (
            (SELECT role_name FROM public.profiles WHERE id = auth.uid()) = 'Agency_Admin' OR
            (SELECT can_manage_catalog FROM public.custom_roles_permissions WHERE tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()) AND role_name = (SELECT role_name FROM public.profiles WHERE id = auth.uid())) = TRUE
        )
    );

-- POLÍTICAS PARA TRANSACTIONS_ORDERS
CREATE POLICY "Clientes ven sus propias compras" ON public.transactions_orders
    FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Agencias ven órdenes de su tenant con permisos financieros" ON public.transactions_orders
    FOR SELECT TO authenticated
    USING (
        tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()) AND
        (
            (SELECT role_name FROM public.profiles WHERE id = auth.uid()) = 'Agency_Admin' OR
            (SELECT can_manage_finance FROM public.custom_roles_permissions WHERE tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()) AND role_name = (SELECT role_name FROM public.profiles WHERE id = auth.uid())) = TRUE
        )
    );

-- POLÍTICAS PARA CHAT_MESSAGES
CREATE POLICY "Usuarios acceden a mensajes si participan en la conversación" ON public.chat_messages
    FOR ALL TO authenticated
    USING (
        sender_id = auth.uid() OR
        (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()) IS NOT NULL
    );
