import { useState, useEffect } from "react";
import { Link } from "react-router";
import { X, Cookie, Settings } from "lucide-react";

type ConsentCategory = "essential" | "functional" | "analytics";

interface ConsentPreferences {
  essential: boolean;
  functional: boolean;
  analytics: boolean;
}

interface ConsentRecord {
  preferences: ConsentPreferences;
  timestamp: string;
  version: number;
}

const CONSENT_KEY = "cookie_consent";
const CONSENT_VERSION = 1;

function detectGPC(): boolean {
  return !!((navigator as unknown) as Record<string, unknown>).globalPrivacyControl;
}

function getStoredConsent(): ConsentRecord | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentRecord;
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function storeConsent(preferences: ConsentPreferences): void {
  const record: ConsentRecord = {
    preferences,
    timestamp: new Date().toISOString(),
    version: CONSENT_VERSION,
  };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
}

export function getConsent(): ConsentPreferences {
  const stored = getStoredConsent();
  if (stored) return stored.preferences;
  return { essential: true, functional: false, analytics: false };
}

export function isAnalyticsAllowed(): boolean {
  if (detectGPC()) return false;
  return getConsent().analytics;
}

export function isFunctionalAllowed(): boolean {
  return getConsent().functional;
}

export function hasConsented(): boolean {
  return getStoredConsent() !== null;
}

export function resetConsent(): void {
  localStorage.removeItem(CONSENT_KEY);
}

const CATEGORY_INFO: { key: ConsentCategory; label: string; description: string; required: boolean }[] = [
  {
    key: "essential",
    label: "Esenciales",
    description: "Necesarias para el funcionamiento de la Plataforma. Incluyen autenticación, seguridad y carrito de compras.",
    required: true,
  },
  {
    key: "functional",
    label: "Funcionales",
    description: "Permiten recordar tus preferencias como el tema (claro/oscuro), idioma y configuración de la app.",
    required: false,
  },
  {
    key: "analytics",
    label: "Telemetría y Analítica",
    description: "Recopilan datos de comportamiento para mejorar recomendaciones, personalizar la experiencia y prevenir abuso.",
    required: false,
  },
];

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<ConsentPreferences>({
    essential: true,
    functional: true,
    analytics: true,
  });
  const [gpcDetected, setGpcDetected] = useState(false);

  useEffect(() => {
    const gpc = detectGPC();
    setGpcDetected(gpc);

    if (gpc) {
      storeConsent({ essential: true, functional: false, analytics: false });
      return;
    }

    const stored = getStoredConsent();
    if (!stored) {
      setVisible(true);
    }
  }, []);

  const handleAcceptAll = () => {
    const prefs: ConsentPreferences = { essential: true, functional: true, analytics: true };
    storeConsent(prefs);
    setVisible(false);
  };

  const handleRejectAll = () => {
    const prefs: ConsentPreferences = { essential: true, functional: false, analytics: false };
    storeConsent(prefs);
    setVisible(false);
  };

  const handleSaveCustom = () => {
    storeConsent(preferences);
    setVisible(false);
    setShowDetails(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50">
      <div className="border-t border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          {!showDetails ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3 flex-1">
                <Cookie className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-text">
                    Usamos cookies y tecnologías de rastreo
                  </p>
                  <p className="mt-1 text-xs text-text-muted leading-relaxed">
                    Utilizamos cookies esenciales para el funcionamiento de la Plataforma, y cookies funcionales y de telemetría para mejorar tu experiencia.
                    Puedes aceptar todas, rechazar las no esenciales o personalizar tus preferencias.
                    {gpcDetected && (
                      <span className="block mt-1 font-medium text-amber-600">
                        Se detectó la señal Global Privacy Control (GPC). Se respetará tu preferencia de opt-out.
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    Más información en nuestra{" "}
                    <Link to="/cookies" className="text-primary hover:underline">
                      Política de Cookies
                    </Link>{" "}
                    y{" "}
                    <Link to="/privacy" className="text-primary hover:underline">
                      Política de Privacidad
                    </Link>.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                <button
                  onClick={() => setShowDetails(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-text-muted hover:bg-gray-50 transition-colors dark:border-gray-600 dark:hover:bg-gray-800"
                >
                  <Settings className="h-3.5 w-3.5" />
                  Personalizar
                </button>
                <button
                  onClick={handleRejectAll}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-text hover:bg-gray-50 transition-colors dark:border-gray-600 dark:hover:bg-gray-800"
                >
                  Rechazar
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white hover:bg-primary-dark transition-colors"
                >
                  Aceptar todo
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-text">Personalizar cookies</h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="rounded-lg p-1 text-text-muted hover:bg-gray-100 transition-colors dark:hover:bg-gray-800"
                  aria-label="Cerrar configuración"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                {CATEGORY_INFO.map((cat) => (
                  <div
                    key={cat.key}
                    className="flex items-start gap-3 rounded-lg border border-gray-100 p-3 dark:border-gray-700"
                  >
                    <label className="relative mt-0.5 flex shrink-0 cursor-items-center">
                      <input
                        type="checkbox"
                        checked={preferences[cat.key]}
                        disabled={cat.required}
                        onChange={(e) =>
                          setPreferences((p) => ({ ...p, [cat.key]: e.target.checked }))
                        }
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50"
                      />
                    </label>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text">{cat.label}</span>
                        {cat.required && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-text-muted dark:bg-gray-700">
                            Siempre activas
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-text-muted">{cat.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {gpcDetected && (
                <p className="mt-3 text-xs font-medium text-amber-600">
                  Señal GPC detectada — Las cookies de telemetría se desactivarán automáticamente.
                </p>
              )}

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  onClick={handleRejectAll}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-text hover:bg-gray-50 transition-colors dark:border-gray-600 dark:hover:bg-gray-800"
                >
                  Rechazar todo
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-text hover:bg-gray-50 transition-colors dark:border-gray-600 dark:hover:bg-gray-800"
                >
                  Aceptar todo
                </button>
                <button
                  onClick={handleSaveCustom}
                  className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white hover:bg-primary-dark transition-colors"
                >
                  Guardar preferencias
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
