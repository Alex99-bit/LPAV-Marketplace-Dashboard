import { useState } from "react";
import { Mail, MapPin, Shield, MessageSquare } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

export default function ContactPage() {
  const { addToast } = useToast();
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      addToast("warning", "Campos incompletos", "Por favor completa todos los campos obligatorios.");
      return;
    }
    setSending(true);
    setTimeout(() => {
      setSending(false);
      addToast("success", "Mensaje enviado", "Te responderemos en un plazo de 48 horas hábiles.");
      setForm({ name: "", email: "", subject: "", message: "" });
    }, 1500);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-text">Contacto</h1>
        <p className="mt-2 text-text-muted">
          ¿Tienes preguntas, dudas o necesitas soporte? Estamos aquí para ayudarte.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-surface-raised p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-text">Correo electrónico</h3>
                <p className="mt-1 text-sm text-text-muted">Para consultas generales y soporte:</p>
                <a href="mailto:soporte@avimo.travel" className="text-sm font-medium text-primary hover:underline">
                  soporte@avimo.travel
                </a>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface-raised p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-text">Protección de Datos (DPO)</h3>
                <p className="mt-1 text-sm text-text-muted">Para ejercer derechos ARCO, privacidad y datos personales:</p>
                <a href="mailto:dpo@avimo.travel" className="text-sm font-medium text-primary hover:underline">
                  dpo@avimo.travel
                </a>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface-raised p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-text">Asuntos Legales</h3>
                <p className="mt-1 text-sm text-text-muted">Para notificaciones legales, disputas y cumplimiento:</p>
                <a href="mailto:legal@avimo.travel" className="text-sm font-medium text-primary hover:underline">
                  legal@avimo.travel
                </a>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface-raised p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-text">Oficinas</h3>
                <p className="mt-1 text-sm text-text-muted">
                  Avimo Technologies S.A. de C.V.<br />
                  Ciudad de México, México
                </p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-surface-raised p-6 space-y-4">
            <h2 className="text-lg font-semibold text-text">Envíanos un mensaje</h2>
            <Input
              label="Nombre completo"
              placeholder="Tu nombre"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Input
              label="Correo electrónico"
              type="email"
              placeholder="tu@correo.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <div>
              <label htmlFor="subject" className="mb-1.5 block text-sm font-medium text-text">
                Asunto
              </label>
              <select
                id="subject"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
              >
                <option value="">Selecciona un asunto</option>
                <option value="general">Consulta general</option>
                <option value="support">Soporte técnico</option>
                <option value="billing">Facturación y pagos</option>
                <option value="privacy">Privacidad y datos personales</option>
                <option value="agency">Registro de agencia</option>
                <option value="legal">Asuntos legales</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <div>
              <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-text">
                Mensaje
              </label>
              <textarea
                id="message"
                rows={5}
                placeholder="Describe tu consulta..."
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text placeholder:text-text-muted transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none resize-none"
              />
            </div>
            <Button type="submit" size="lg" className="w-full" loading={sending}>
              <Mail className="h-4 w-4" />
              Enviar mensaje
            </Button>
            <p className="text-center text-xs text-text-muted">
              Responderemos en un plazo de 48 horas hábiles.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
