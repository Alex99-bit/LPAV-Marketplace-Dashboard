import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { INTEREST_TAGS, REGIONS, BUDGET_RANGES } from "@/lib/constants";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function OnboardingModal({ open, onClose, onComplete }: OnboardingModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [interests, setInterests] = useState<string[]>([]);
  const [destinations, setDestinations] = useState<string[]>([]);
  const [budget, setBudget] = useState("");
  const [style, setStyle] = useState("");
  const [saving, setSaving] = useState(false);

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
    setSaving(true);

    const sorted = [...interests, budget, style].sort().join("|");
    const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sorted));
    const hash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");

    await supabase.from("user_recommendation_profiles").upsert({
      user_id: user.id,
      onboarding_completed: true,
      cluster_interests_hash: hash,
      preferred_destinations: destinations.length > 0 ? destinations : null,
      target_budget_range: (budget || null) as "Bajo" | "Medio" | "Alto" | "Premium" | null,
    });

    setSaving(false);
    onComplete();
  };

  const steps = [
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
          {["Mochilero", "Estándar", "Confort", "Lujo"].map((s) => (
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

  const currentStep = steps[step]!;

  return (
    <Modal open={open} onClose={onClose} title={currentStep.title} size="lg">
      <div className="space-y-6">
        {currentStep.content}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => (step > 0 ? setStep(step - 1) : onClose())}
          >
            {step > 0 ? "Anterior" : "Cancelar"}
          </Button>
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep(step + 1)}>Siguiente</Button>
          ) : (
            <Button onClick={handleSubmit} loading={saving}>
              Completar
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
