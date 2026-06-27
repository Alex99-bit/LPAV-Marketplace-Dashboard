import { Link } from "react-router";
import Button from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="text-6xl font-bold text-primary/20">404</span>
      <h1 className="text-2xl font-semibold text-text">
        Página no encontrada
      </h1>
      <p className="max-w-md text-text-muted">
        La página que buscas no existe o fue movida a otra ubicación.
      </p>
      <Link to="/">
        <Button>Volver al inicio</Button>
      </Link>
    </div>
  );
}
