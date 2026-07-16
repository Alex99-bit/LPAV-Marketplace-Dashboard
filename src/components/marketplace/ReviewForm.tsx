import { useState } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface ReviewFormProps {
  packageId: string;
  orderId: string;
  onSubmit: () => void;
}

export default function ReviewForm({ packageId, orderId, onSubmit }: ReviewFormProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from("package_reviews").insert({
      package_id: packageId,
      order_id: orderId,
      user_id: user.id,
      rating,
      title: title || null,
      comment: comment || null,
    });
    setSaving(false);
    onSubmit();
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 space-y-4">
      <h3 className="text-lg font-semibold text-text">Deja tu Reseña</h3>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            className="transition-colors"
          >
            <Star
              className={`h-6 w-6 ${
                star <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300"
              }`}
            />
          </button>
        ))}
      </div>
      <Input
        label="Título"
        placeholder="Resume tu experiencia"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <div>
        <label className="mb-1 block text-sm font-medium text-text">Comentario</label>
        <textarea
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          rows={4}
          placeholder="Cuéntanos sobre tu viaje..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>
      <Button onClick={handleSubmit} loading={saving}>
        Publicar Reseña
      </Button>
    </div>
  );
}
