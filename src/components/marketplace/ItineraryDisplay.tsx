import type { ItineraryData } from "@/types";
import { Calendar, MapPin, Clock } from "lucide-react";

interface ItineraryDisplayProps {
  itinerary: ItineraryData;
}

export default function ItineraryDisplay({ itinerary }: ItineraryDisplayProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-text">{itinerary.title}</h3>
        {itinerary.description && (
          <p className="mt-1 text-sm text-text-muted">{itinerary.description}</p>
        )}
        <p className="mt-1 flex items-center gap-1 text-xs text-text-muted">
          <Calendar className="h-3.5 w-3.5" />
          {itinerary.totalDays} días
        </p>
      </div>

      <div className="space-y-3">
        {itinerary.days.map((day) => (
          <div
            key={day.dayNumber}
            className="rounded-xl border border-gray-100 bg-surface/50 p-4"
          >
            <h4 className="mb-2 text-sm font-semibold text-text">
              Día {day.dayNumber}: {day.title}
            </h4>
            <div className="space-y-2">
              {day.activities.map((act, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <span className="flex items-center gap-1 text-xs font-medium text-primary whitespace-nowrap">
                    <Clock className="h-3.5 w-3.5" />
                    {act.time}
                  </span>
                  <div>
                    <p className="text-text">{act.description}</p>
                    {act.location && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-text-muted">
                        <MapPin className="h-3 w-3" />
                        {act.location}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
