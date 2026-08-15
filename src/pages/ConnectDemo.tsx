// ============================================================================
// ConnectDemo.tsx
// Página de demostración de la integración Stripe Connect (API V2).
//
// Secciones:
//   1. Onboarding: crear cuenta conectada, iniciar onboarding y ver el estado
//      (el estado SIEMPRE se consulta directo a la API de Stripe).
//   2. Crear producto: crea productos a nivel plataforma y los asocia a una
//      cuenta conectada.
//   3. Storefront: muestra todos los productos y cuentas, y permite comprar
//      (Checkout alojado de Stripe con destination charge + application fee).
//
// La sección de onboarding requiere sesión; el storefront es público.
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Card from "@/components/ui/Card";

// ----------------------------------------------------------------------------
// Tipos locales de la demo.
// ----------------------------------------------------------------------------
interface ConnectAccount {
  id: string;
  stripe_account_id: string;
  display_name: string | null;
  contact_email: string | null;
  country: string;
  onboarding_status: string;
}

interface AccountStatus {
  ready_to_receive_payments: boolean;
  requirements_status: string | null;
  onboarding_complete: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price_in_cents: number | null;
  currency: string;
  connected_account_id: string | null;
}

const CURRENCIES = [
  { value: "mxn", label: "MXN" },
  { value: "usd", label: "USD" },
  { value: "eur", label: "EUR" },
];

const COUNTRIES = [
  { value: "us", label: "Estados Unidos (us)" },
  { value: "mx", label: "México (mx)" },
];

export default function ConnectDemo() {
  const { user } = useAuth();

  const [accounts, setAccounts] = useState<ConnectAccount[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [statuses, setStatuses] = useState<Record<string, AccountStatus>>({});

  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estado del formulario de onboarding.
  const [displayName, setDisplayName] = useState("");
  const [contactEmail, setContactEmail] = useState(user?.email ?? "");
  const [country, setCountry] = useState("us");

  // Estado del formulario de producto.
  const [productName, setProductName] = useState("");
  const [productDesc, setProductDesc] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productCurrency, setProductCurrency] = useState("mxn");
  const [productAccount, setProductAccount] = useState("");

  // --------------------------------------------------------------------------
  // Cargar mis cuentas conectadas (desde BD) y los productos (desde Stripe).
  // --------------------------------------------------------------------------
  const loadAccounts = useCallback(async () => {
    if (!user) return;
    setLoadingAccounts(true);
    const { data, error: err } = await supabase
      .from("connect_accounts")
      .select("*")
      .order("created_at", { ascending: false });
    if (!err) setAccounts((data as ConnectAccount[]) ?? []);
    setLoadingAccounts(false);
  }, [user]);

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    const { data, error: err } = await supabase.functions.invoke(
      "connect-products",
      { method: "GET" },
    );
    if (!err) setProducts((data as { products: Product[] })?.products ?? []);
    setLoadingProducts(false);
  }, []);

  useEffect(() => {
    loadAccounts();
    loadProducts();
  }, [loadAccounts, loadProducts]);

  // --------------------------------------------------------------------------
  // Si venimos de un checkout exitoso (?session_id=...), mostramos mensaje.
  // --------------------------------------------------------------------------
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("session_id")) {
      setSuccess("Pago completado. Revisa los webhooks para ver el cumplimiento.");
    }
  }, []);

  // --------------------------------------------------------------------------
  // 1) Crear cuenta conectada (API V2).
  // --------------------------------------------------------------------------
  const handleCreateAccount = async () => {
    setError(null);
    setCreatingAccount(true);
    try {
      const { data, error: err } = await supabase.functions.invoke(
        "connect-account",
        {
          body: {
            display_name: displayName,
            contact_email: contactEmail,
            country,
          },
        },
      );
      if (err) throw err;
      setSuccess(`Cuenta creada: ${(data as { account_id: string }).account_id}`);
      await loadAccounts();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreatingAccount(false);
    }
  };

  // --------------------------------------------------------------------------
  // 2) Iniciar onboarding (crea account link y redirige).
  // --------------------------------------------------------------------------
  const handleOnboard = async (accountId: string) => {
    setError(null);
    const { data, error: err } = await supabase.functions.invoke(
      "connect-onboard",
      { body: { account_id: accountId } },
    );
    if (err) {
      setError(err.message);
      return;
    }
    const url = (data as { url: string })?.url;
    if (url) window.location.href = url;
  };

  // --------------------------------------------------------------------------
  // 3) Consultar estado de onboarding (directo de la API de Stripe).
  // --------------------------------------------------------------------------
  const handleGetStatus = async (accountId: string) => {
    setError(null);
    const { data, error: err } = await supabase.functions.invoke(
      "connect-status",
      { body: { account_id: accountId } },
    );
    if (err) {
      setError(err.message);
      return;
    }
    setStatuses((prev) => ({ ...prev, [accountId]: data as AccountStatus }));
  };

  // --------------------------------------------------------------------------
  // 4) Crear producto a nivel plataforma.
  // --------------------------------------------------------------------------
  const handleCreateProduct = async () => {
    setError(null);
    setCreatingProduct(true);
    try {
      const priceInCents = Math.round(parseFloat(productPrice) * 100);
      const { error: err } = await supabase.functions.invoke("connect-products", {
        body: {
          name: productName,
          description: productDesc,
          price_in_cents: priceInCents,
          currency: productCurrency,
          connected_account_id: productAccount,
        },
      });
      if (err) throw err;
      setSuccess("Producto creado.");
      setProductName("");
      setProductDesc("");
      setProductPrice("");
      await loadProducts();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreatingProduct(false);
    }
  };

  // --------------------------------------------------------------------------
  // 5) Comprar (crea checkout session y redirige).
  // --------------------------------------------------------------------------
  const handleBuy = async (product: Product) => {
    setError(null);
    setBuying(product.id);
    try {
      const { data, error: err } = await supabase.functions.invoke(
        "connect-checkout",
        { body: { product_id: product.id, quantity: 1 } },
      );
      if (err) throw err;
      const url = (data as { url: string })?.url;
      if (url) window.location.href = url;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBuying(null);
    }
  };

  const formatPrice = (p: Product) => {
    const amount = (p.price_in_cents ?? 0) / 100;
    return `${p.currency.toUpperCase()} ${amount.toFixed(2)}`;
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-text">Stripe Connect (demo V2)</h1>
      <p className="mt-1 text-sm text-text-muted">
        Integración de muestra: onboarding, productos y storefront con
        destination charges.
      </p>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {/* =====================================================================
          1. ONBOARDING
          ===================================================================== */}
      <Card className="mt-6">
        <h2 className="text-lg font-semibold text-text">1. Onboarding de vendedor</h2>

        {!user && (
          <p className="mt-2 text-sm text-text-muted">
            Inicia sesión para crear tu cuenta conectada y empezar a vender.
          </p>
        )}

        {user && (
          <>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                label="Nombre del negocio"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Mi Agencia de Viajes"
              />
              <Input
                label="Email de contacto"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="contacto@agencia.com"
              />
              <Select
                label="País"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                options={COUNTRIES}
              />
            </div>
            <Button className="mt-4" onClick={handleCreateAccount} loading={creatingAccount}>
              Crear cuenta conectada
            </Button>
          </>
        )}

        {/* Mis cuentas conectadas */}
        {user && (
          <div className="mt-6 space-y-3">
            {loadingAccounts && <p className="text-sm text-text-muted">Cargando…</p>}
            {!loadingAccounts && accounts.length === 0 && (
              <p className="text-sm text-text-muted">Aún no tienes cuentas conectadas.</p>
            )}
            {accounts.map((acc) => {
              const status = statuses[acc.stripe_account_id];
              return (
                <div
                  key={acc.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white p-4"
                >
                  <div>
                    <p className="font-medium text-text">{acc.display_name}</p>
                    <p className="text-xs text-text-muted">
                      {acc.stripe_account_id} · {acc.country.toUpperCase()}
                    </p>
                    {status && (
                      <p className="mt-1 text-xs">
                        <span className="font-medium text-text">Recibe pagos:</span>{" "}
                        {status.ready_to_receive_payments ? (
                          <span className="text-emerald-600">Sí</span>
                        ) : (
                          <span className="text-amber-600">No</span>
                        )}{" "}
                        ·{" "}
                        <span className="text-text-muted">
                          {status.requirements_status ?? "sin requisitos"}
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleGetStatus(acc.stripe_account_id)}>
                      Ver estado
                    </Button>
                    <Button size="sm" onClick={() => handleOnboard(acc.stripe_account_id)}>
                      Onboard para cobrar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* =====================================================================
          2. CREAR PRODUCTO
          ===================================================================== */}
      {user && accounts.length > 0 && (
        <Card className="mt-6">
          <h2 className="text-lg font-semibold text-text">2. Crear producto</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Nombre"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Tour Cancún 3 noches"
            />
            <Select
              label="Cuenta conectada (vendedor)"
              value={productAccount}
              onChange={(e) => setProductAccount(e.target.value)}
              placeholder="Selecciona…"
              options={accounts.map((a) => ({
                value: a.stripe_account_id,
                label: a.display_name ?? a.stripe_account_id,
              }))}
            />
            <Input
              label="Precio (en unidades)"
              type="number"
              value={productPrice}
              onChange={(e) => setProductPrice(e.target.value)}
              placeholder="1500.00"
            />
            <Select
              label="Moneda"
              value={productCurrency}
              onChange={(e) => setProductCurrency(e.target.value)}
              options={CURRENCIES}
            />
            <Input
              label="Descripción"
              value={productDesc}
              onChange={(e) => setProductDesc(e.target.value)}
              placeholder="Descripción opcional"
            />
          </div>
          <Button className="mt-4" onClick={handleCreateProduct} loading={creatingProduct}>
            Crear producto
          </Button>
        </Card>
      )}

      {/* =====================================================================
          3. STOREFRONT
          ===================================================================== */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-text">3. Storefront</h2>
        <p className="text-sm text-text-muted">
          Todos los productos y cuentas conectadas.
        </p>

        {loadingProducts && <p className="mt-2 text-sm text-text-muted">Cargando…</p>}

        {!loadingProducts && products.length === 0 && (
          <p className="mt-2 text-sm text-text-muted">No hay productos todavía.</p>
        )}

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <Card key={p.id} className="flex flex-col">
              <p className="text-lg font-semibold text-text">{p.name}</p>
              <p className="mt-1 flex-1 text-sm text-text-muted">{p.description || "Sin descripción"}</p>
              <p className="mt-3 text-xl font-bold text-text">{formatPrice(p)}</p>
              <p className="mt-1 text-xs text-text-muted">
                Vendedor: {p.connected_account_id ?? "sin cuenta"}
              </p>
              <Button
                className="mt-4 w-full"
                onClick={() => handleBuy(p)}
                loading={buying === p.id}
                disabled={!p.connected_account_id || p.price_in_cents == null}
              >
                Comprar
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
