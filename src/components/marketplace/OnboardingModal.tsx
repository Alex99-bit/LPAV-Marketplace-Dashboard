import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { INTEREST_TAGS, REGIONS, BUDGET_RANGES } from "@/lib/constants";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Stepper from "@/components/ui/Stepper";

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const STEPS = [
  { key: "interests", label: "Intereses" },
  { key: "destinations", label: "Destinos" },
  { key: "budget", label: "Presupuesto" },
  { key: "style", label: "Estilo" },
];

const TRAVEL_STYLES = ["Mochilero", "Estándar", "Confort", "Lujo"];

export default function OnboardingModal({ open, onClose, onComplete }: OnboardingModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [interests, setInterests] = useState<string[]>([]);
  const [destinations, setDestinations] = useState<string[]>([]);
  const [budget, setBudget] = useState("");
  const [style, setStyle] = useState("");
  const [saving, setSaving] = useState(false);

  const currentStepKey = STEPS[step]!.key;

  const toggleInterest = (tag: string) => {
    setInterests((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const toggleDestination = (region: string) => {
    setDestinations((prev) =>
      prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]
    );
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (interests.length === 0) {
      // TODO(F3-onboarding): feedback inline de validación en vez de alert silencioso.
      return;
    }
    setSaving(true);

    const sorted = [...interests, budget, style].sort().join("|");
    const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sorted));
    const hash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");

    // TODO(F3-onboarding-style): la columna travel_style debe agregarse a
    // user_recommendation_profiles en BD. Por ahora el estilo solo alimenta
    // el hash de caché de itinerarios.
    await supabase.from("user_recommendation_profiles").upsert({
      user_id: user.id,
      onboarding_completed: true,
      cluster_interests_hash: hash,
      interests_tags: interests.length > 0 ? interests : null,
      preferred_destinations: destinations.length > 0 ? destinations : null,
      target_budget_range: (budget || null) as "Bajo" | "Medio" | "Alto" | "Premium" | null,
    });

    setSaving(false);
    onComplete();
  };

  const stepViews = [
    {
      title: "¿Qué te interesa?",
      content: (
        <div className="flex flex-wrap gap-2">
          {INTEREST_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleInterest(tag)}
              className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                interests.includes(tag)
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-text-muted hover:bg-gray-200"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "¿A dónde te gustaría ir?",
      content: (
        <div className="flex flex-wrap gap-2">
          {REGIONS.map((region) => (
            <button
              key={region}
              onClick={() => toggleDestination(region)}
              className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                destinations.includes(region)
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-text-muted hover:bg-gray-200"
              }`}
            >
              {region}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "¿Cuál es tu presupuesto?",
      content: (
        <div className="space-y-2">
          {BUDGET_RANGES.map((range) => (
            <button
              key={range.value}
              onClick={() => setBudget(range.value)}
              className={`w-full rounded-xl px-4 py-3 text-left text-sm transition-colors ${
                budget === range.value
                  ? "bg-primary/10 border-primary border text-primary"
                  : "bg-gray-50 border border-gray-100 text-text hover:bg-gray-100"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "¿Cuál es tu estilo de viaje?",
      content: (
        <div className="space-y-2">
          {TRAVEL_STYLES.map((s) => (
            <button
              key={s}
              onClick={() => setStyle(s)}
              className={`w-full rounded-xl px-4 py-3 text-left text-sm transition-colors ${
                style === s
                  ? "bg-primary/10 border-primary border text-primary"
                  : "bg-gray-50 border border-gray-100 text-text hover:bg-gray-100"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      ),
    },
  ];

  const current = stepViews[step]!;

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <Stepper steps={STEPS} currentStep={currentStepKey} className="mb-4" />
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-text">{current.title}</h3>
        {current.content}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => (step > 0 ? setStep(step - 1) : onClose())}
          >
            {step > 0 ? "Anterior" : "Cancelar"}
          </Button>
          {step < stepViews.length - 1 ? (
            <Button onClick={() => setStep(step + 1)}>Siguiente</Button>
          ) : (
            <Button
              onClick={handleSubmit}
              loading={saving}
              disabled={interests.length === 0}
            >
              Completar
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
