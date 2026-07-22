import { useRef } from "react";
import { Sparkles, Search } from "lucide-react";
import Button from "@/components/ui/Button";

interface HeroProps {
  searchValue: string;
  onSearchChange: (query: string) => void;
  onInspiration: () => void;
}

export default function Hero({
  searchValue,
  onSearchChange,
  onInspiration,
}: HeroProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-white to-primary-light/10 dark:bg-none dark:bg-gray-900">
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
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              ref={inputRef}
              type="text"
              placeholder="¿A dónde quieres viajar?"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && inputRef.current) {
                  inputRef.current.blur();
                }
              }}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 py-3 pl-10 pr-4 text-sm text-text shadow-sm transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />
          </div>
          <Button
            onClick={onInspiration}
            variant="secondary"
            size="lg"
            className="whitespace-nowrap"
          >
            <Sparkles className="h-4 w-4" />
            Inspiración
          </Button>
        </div>
      </div>
    </section>
  );
}
