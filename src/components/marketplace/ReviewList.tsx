import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { PackageReview } from "@/types";

interface ReviewListProps {
  packageId: string;
}

export default function ReviewList({ packageId }: ReviewListProps) {
  const [reviews, setReviews] = useState<PackageReview[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("package_reviews")
        .select("*")
        .eq("package_id", packageId)
        .eq("status", "published")
        .order("created_at", { ascending: false });
      setReviews(data ?? []);
      if (data && data.length > 0) {
        setAvgRating(data.reduce((sum, r) => sum + r.rating, 0) / data.length);
      }
      setLoading(false);
    })();
  }, [packageId]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <h3 className="text-lg font-semibold text-text">Reseñas</h3>
        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-lg bg-gray-100 p-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-24 rounded bg-gray-200" />
                  <div className="h-3 w-32 rounded bg-gray-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <h3 className="text-lg font-semibold text-text">Reseñas</h3>
        <p className="mt-4 text-sm text-text-muted text-center py-4">
          Aún no hay reseñas para este paquete.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text">Reseñas</h3>
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
          <span className="text-sm font-medium text-text">{avgRating.toFixed(1)}</span>
          <span className="text-xs text-text-muted">({reviews.length})</span>
        </div>
      </div>
      <div className="mt-4 space-y-4">
        {reviews.map((review) => (
          <div key={review.review_id} className="border-b border-gray-50 pb-4 last:border-0">
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {Array.from({ length: review.rating }, (_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              {review.title && (
                <span className="text-sm font-medium text-text">{review.title}</span>
              )}
            </div>
            {review.comment && (
              <p className="mt-2 text-sm text-text-muted">{review.comment}</p>
            )}
            <p className="mt-1 text-xs text-text-muted">
              {new Date(review.created_at).toLocaleDateString("es-MX")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
