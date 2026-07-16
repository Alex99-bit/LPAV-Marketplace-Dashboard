import { useState, useCallback, useRef } from "react";
import { Upload, X, CheckCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import Spinner from "@/components/ui/Spinner";

interface FlyerImageUploadProps {
  onUploadComplete: (path: string, url: string) => void;
  currentImage?: string;
}

export default function FlyerImageUpload({ onUploadComplete, currentImage }: FlyerImageUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage ?? null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

  const validateAndUpload = useCallback(async (file: File) => {
    setError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Formato no válido. Usa JPEG, PNG o WebP.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("El archivo es demasiado grande (máx 10MB).");
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;

    await new Promise((resolve) => { img.onload = resolve; });
    URL.revokeObjectURL(url);

    const ratio = img.width / img.height;
    const targetRatio = 3 / 4;
    if (Math.abs(ratio - targetRatio) > 0.1) {
      setError(`Aspect ratio recomendado: 3:4. Actual: ${(ratio).toFixed(2)}`);
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const { data: presignedData, error: presignedError } = await supabase.functions.invoke("presigned-url", {
        body: { file_name: file.name, content_type: file.type },
      });

      if (presignedError || !presignedData?.signedUrl) {
        const filePath = `flyers/${user.id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("flyers")
          .upload(filePath, file, { contentType: file.type, upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from("flyers").getPublicUrl(filePath);
        setPreview(urlData.publicUrl);
        onUploadComplete(filePath, urlData.publicUrl);
      } else {
        const res = await fetch(presignedData.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!res.ok) throw new Error("Error subiendo imagen");

        setPreview(presignedData.signedUrl.split("?")[0]);
        onUploadComplete(presignedData.path, presignedData.signedUrl.split("?")[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setUploading(false);
    }
  }, [onUploadComplete]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) validateAndUpload(file);
  }, [validateAndUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndUpload(file);
  }, [validateAndUpload]);

  const handleRemove = () => {
    setPreview(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (preview) {
    return (
      <div className="relative rounded-xl border border-gray-200 overflow-hidden">
        <img src={preview} alt="Preview" className="w-full h-48 object-cover" />
        <button
          onClick={handleRemove}
          className="absolute top-2 right-2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-lg bg-emerald-500 px-2 py-1 text-xs text-white">
          <CheckCircle className="h-3.5 w-3.5" />
          Imagen cargada
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragging
            ? "border-primary bg-primary/5"
            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
        }`}
      >
        {uploading ? (
          <Spinner size="md" />
        ) : (
          <>
            <Upload className="h-8 w-8 text-text-muted" />
            <div>
              <p className="text-sm font-medium text-text">
                Arrastra tu imagen aquí o haz clic
              </p>
              <p className="mt-1 text-xs text-text-muted">
                JPEG, PNG o WebP · Máx 10MB · Recomendado 3:4
              </p>
            </div>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={handleFileSelect}
        className="hidden"
      />

      {error && (
        <div className="mt-2 flex items-center gap-2 text-xs text-amber-600">
          <AlertTriangle className="h-3.5 w-3.5" />
          {error}
        </div>
      )}
    </div>
  );
}
