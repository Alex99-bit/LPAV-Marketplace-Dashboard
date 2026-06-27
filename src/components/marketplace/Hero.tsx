import { Sparkles } from "lucide-react";
import Button from "@/components/ui/Button";

interface HeroProps {
  onSearch: (query: string) => void;
  onInspiration: () => void;
}

export default function Hero({ onSearch, onInspiration }: HeroProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-white to-primary-light/10">
      <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28">
        <h1 className="text-4xl font-bold tracking-tight text-text sm:text-5xl">
          Descubre tu próximo{" "}
          <span className="text-primary">viaje perfecto</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-text-muted">
          Conecta directamente con agencias de viaje especializadas. Paquetes
          exclusivos con itinerarios personalizados por Inteligencia Artificial.
        </p>

        <div className="mx-auto mt-8 flex max-w-lg flex-col gap-3 sm:flex-row">
          <input
            type="text"
            placeholder="¿A dónde quieres viajar?"
            onKeyDown={(e) => {
              if (e.key === "Enter") onSearch(e.currentTarget.value);
            }}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm shadow-sm transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
          />
          <Button
            onClick={onInspiration}
            variant="secondary"
            size="lg"
            className="whitespace-nowrap"
          >
            <Sparkles className="h-4 w-4" />
            Inspiración ✨
          </Button>
        </div>
      </div>
    </section>
  );
}
