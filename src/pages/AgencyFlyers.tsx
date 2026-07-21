import { useState, useEffect } from "react";
import { Plus, Eye, Archive } from "lucide-react";
import type { TravelPackage } from "@/types";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { PUBLICATION_STATES } from "@/lib/constants";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Switch from "@/components/ui/Switch";
import { CURRENCIES, REGIONS } from "@/lib/constants";
import FlyerImageUpload from "@/components/agency/FlyerImageUpload";

export default function AgencyFlyers() {
  const { profile } = useAuth();
  const { addToast } = useToast();
  const [packages, setPackages] = useState<TravelPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [archivingPkg, setArchivingPkg] = useState<TravelPackage | null>(null);

  const [form, setForm] = useState({
    title: "",
    region: "",
    price: "",
    currency: "MXN",
    departure_date: "",
    has_coordinator: false,
    deposit_percent: "20",
    max_installments: "0",
    description: "",
  });
  const [_imagePath, setImagePath] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const fetchPackages = async () => {
    if (!profile?.tenant_id) return;
    const { data } = await supabase
      .from("travel_packages")
      .select("*")
      .eq("tenant_id", profile.tenant_id!)
      .order("created_at", { ascending: false });
    setPackages(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPackages();
  }, [profile?.tenant_id]);

  const handleCreate = async () => {
    if (!profile?.tenant_id) return;
    setSaving(true);

    const { error } = await supabase.from("travel_packages").insert({
      tenant_id: profile.tenant_id,
      title: form.title,
      region: form.region,
      price: Number(form.price),
      currency: form.currency,
      // TODO(F4-flyer-imagen): nunca persistir placehold.co en BD. Hacer la
      // imagen obligatoria en el wizard de creación o generar thumbnail real.
      // El placeholder en producción es contenido falso en el marketplace.
      url_flyer_storage: imageUrl ?? "https://placehold.co/600x800/3B82F6/white?text=Flyer",
      url_thumbnail_storage: imageUrl ?? "https://placehold.co/300x400/3B82F6/white?text=Flyer",
      departure_date: new Date(form.departure_date).toISOString(),
      has_coordinator: form.has_coordinator,
      publication_status: "draft",
      deposit_percent: Number(form.deposit_percent) / 100,
      max_installments: Number(form.max_installments),
      description: form.description || null,
    });

    if (!error) {
      setShowForm(false);
      // ...reset form
      setForm({
        title: "",
        region: "",
        price: "",
        currency: "MXN",
        departure_date: "",
        has_coordinator: false,
        deposit_percent: "20",
        max_installments: "0",
        description: "",
      });
      setImagePath(null);
      setImageUrl(null);
      fetchPackages();
      addToast("success", "Flyer creado");
    } else {
      addToast("error", "No se pudo crear el flyer", error.message);
    }
    setSaving(false);
  };

  const handlePublish = async (pkg: TravelPackage) => {
    await supabase
      .from("travel_packages")
      .update({
        publication_status:
          pkg.publication_status === "published" ? "draft" : "published",
      })
      .eq("package_id", pkg.package_id);
    fetchPackages();
  };

  const handleArchive = async () => {
    if (!archivingPkg) return;
    await supabase
      .from("travel_packages")
      .update({ publication_status: "archived" })
      .eq("package_id", archivingPkg.package_id);
    setArchivingPkg(null);
    fetchPackages();
    addToast("info", "Flyer archivado", `"${archivingPkg.title}" ya no aparece en el catálogo.`);
  };

  const handleUploadComplete = (path: string, url: string) => {
    setImagePath(path);
    setImageUrl(url);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Mis Flyers</h1>
          <p className="mt-1 text-sm text-text-muted">
            {packages.length} paquete{packages.length !== 1 && "s"}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" /> Nuevo Flyer
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-surface">
            <tr>
              <th className="px-4 py-3 font-medium text-text-muted">Paquete</th>
              <th className="px-4 py-3 font-medium text-text-muted">Estado</th>
              <th className="px-4 py-3 font-medium text-text-muted">Precio</th>
              <th className="px-4 py-3 font-medium text-text-muted">Salida</th>
              <th className="px-4 py-3 font-medium text-text-muted">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {packages.map((pkg) => {
              const status = PUBLICATION_STATES[pkg.publication_status];
              return (
                <tr
                  key={pkg.package_id}
                  className="border-b border-gray-50 last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={pkg.url_thumbnail_storage}
                        alt={pkg.title}
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                      <div>
                        <p className="font-medium text-text">{pkg.title}</p>
                        <p className="text-xs text-text-muted">{pkg.region}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge>{status.label}</Badge>
                  </td>
                  <td className="px-4 py-3 font-medium text-text">
                    {formatCurrency(pkg.price, pkg.currency)}
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {formatDate(pkg.departure_date)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => handlePublish(pkg)}
                        className="rounded-lg p-1.5 text-text-muted hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        aria-label={
                          pkg.publication_status === "published"
                            ? `Despublicar ${pkg.title}`
                            : `Publicar ${pkg.title}`
                        }
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setArchivingPkg(pkg)}
                        className="rounded-lg p-1.5 text-text-muted hover:bg-amber-50 hover:text-amber-600 transition-colors"
                        title="Archivar"
                        aria-label={`Archivar ${pkg.title}`}
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {packages.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <span className="text-4xl">📦</span>
            <p className="text-sm text-text-muted">
              No tienes paquetes aún. ¡Crea tu primer flyer!
            </p>
          </div>
        )}
      </div>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Nuevo Flyer"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Título del viaje"
            placeholder="Ej: Aventura en Cancún 5 días / 4 noches"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Select
            label="Región"
            options={REGIONS.map((r) => ({ value: r, label: r }))}
            value={form.region}
            onChange={(e) => setForm({ ...form, region: e.target.value })}
            placeholder="Selecciona una región"
          />
          <div className="grid grid-cols-2 gap-4">
              <Input
                label="Precio"
                type="number"
                min="0"
                step="0.01"
                placeholder="15000"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            <Select
              label="Divisa"
              options={CURRENCIES}
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            />
          </div>
          <Input
            label="Fecha de salida"
            type="date"
            min={new Date().toISOString().split("T")[0]}
            value={form.departure_date}
            onChange={(e) =>
              setForm({ ...form, departure_date: e.target.value })
            }
          />
          <div className="w-full">
            <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="flyer-desc">
              Descripción
            </label>
            <textarea
              id="flyer-desc"
              placeholder="Describe el viaje, itinerario y lo que incluye..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-text transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none resize-y"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="% Anticipo"
              type="number"
              min="20"
              max="100"
              value={form.deposit_percent}
              onChange={(e) => setForm({ ...form, deposit_percent: e.target.value })}
            />
            <Input
              label="Meses máx. a financiar"
              type="number"
              min="0"
              max="4"
              value={form.max_installments}
              onChange={(e) => setForm({ ...form, max_installments: e.target.value })}
            />
          </div>
          {/* TODO(F4-maxflyers): validar contra el límite del plan antes de
              insertar. Si la agencia ya tiene maxFlyers publicados, mostrar
              mensaje de upsell con link a PlanManagement. */}
          <Switch
            label="Coordinador de viaje"
            checked={form.has_coordinator}
            onChange={(checked) =>
              setForm({ ...form, has_coordinator: checked })
            }
          />

          <div className="rounded-xl border border-gray-100 p-4 space-y-3">
            <h4 className="text-sm font-medium text-text">Configuración de Pagos</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="% Anticipo"
                type="number"
                min="20"
                max="100"
                value={form.deposit_percent}
                onChange={(e) => setForm({ ...form, deposit_percent: e.target.value })}
              />
              <Input
                label="Meses diferidos (máx 4)"
                type="number"
                min="0"
                max="4"
                value={form.max_installments}
                onChange={(e) => setForm({ ...form, max_installments: e.target.value })}
              />
            </div>
            {Number(form.max_installments) > 0 && Number(form.price) > 0 && (
              <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
                <p className="font-medium">Plan de pagos estimado:</p>
                <ul className="mt-1 space-y-0.5">
                  <li>Anticipo: {form.deposit_percent}% = {formatCurrency(Number(form.price) * Number(form.deposit_percent) / 100, form.currency as "MXN" | "USD" | "EUR")}</li>
                  {Array.from({ length: Number(form.max_installments) }, (_, i) => (
                    <li key={i}>
                      Abono {i + 1}: {formatCurrency(
                        (Number(form.price) * (1 - Number(form.deposit_percent) / 100)) / Number(form.max_installments),
                        form.currency as "MXN" | "USD" | "EUR"
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <FlyerImageUpload onUploadComplete={handleUploadComplete} />

          <Button
            className="w-full"
            loading={saving}
            onClick={handleCreate}
            disabled={!form.title || !form.region || !form.price || !form.departure_date}
          >
            <Plus className="h-4 w-4" /> Crear Flyer
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={archivingPkg !== null}
        onClose={() => setArchivingPkg(null)}
        title="Archivar flyer"
        description={
          archivingPkg
            ? `¿Estás seguro de que quieres archivar "${archivingPkg.title}"? El flyer dejará de estar visible en el catálogo público.`
            : undefined
        }
        confirmLabel="Archivar"
        variant="danger"
        onConfirm={handleArchive}
      />
    </div>
  );
}
