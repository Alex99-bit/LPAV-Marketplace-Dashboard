import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  loading?: boolean;
  onConfirm: () => void;
}

export default function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "default",
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  // TODO(F5-a11y-modal): añadir focus trap, foco inicial y aria-labelledby
  // al Modal base en lugar de repetir en cada consumidor.
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="text-center sm:text-left">
        <h3 className="text-lg font-semibold text-text">{title}</h3>
        {description && (
          <p className="mt-2 text-sm text-text-muted">{description}</p>
        )}
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={loading}
        >
          {cancelLabel}
        </Button>
        <Button
          size="sm"
          variant={variant === "danger" ? "danger" : "primary"}
          loading={loading}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
