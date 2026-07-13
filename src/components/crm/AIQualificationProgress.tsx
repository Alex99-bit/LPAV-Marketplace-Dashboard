interface AIQualificationProgressProps {
  fieldsExtracted: Record<string, unknown>;
  className?: string;
}

const REQUIRED_FIELDS = ["estimated_budget"];
const OPTIONAL_FIELDS = [
  "number_of_travelers",
  "preferred_travel_dates",
  "travel_type",
  "traveler_origin",
  "preferred_airline",
  "accommodation_type",
];

const FIELD_LABELS: Record<string, string> = {
  estimated_budget: "Presupuesto",
  number_of_travelers: "Viajeros",
  preferred_travel_dates: "Fechas",
  travel_type: "Tipo de viaje",
  traveler_origin: "Origen",
  preferred_airline: "Aerolinea",
  accommodation_type: "Alojamiento",
};

export default function AIQualificationProgress({
  fieldsExtracted,
  className = "",
}: AIQualificationProgressProps) {
  const allFields = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];
  const filledCount = allFields.filter(
    (f) => fieldsExtracted[f] !== undefined && fieldsExtracted[f] !== null && fieldsExtracted[f] !== "",
  ).length;
  const progress = Math.round((filledCount / allFields.length) * 100);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-muted">Cualificacion IA</span>
        <span className="text-xs font-semibold text-text">{progress}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-1">
        {allFields.map((field) => {
          const isFilled =
            fieldsExtracted[field] !== undefined &&
            fieldsExtracted[field] !== null &&
            fieldsExtracted[field] !== "";
          const isRequired = REQUIRED_FIELDS.includes(field);
          return (
            <span
              key={field}
              className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                isFilled
                  ? "bg-emerald-50 text-emerald-700"
                  : isRequired
                    ? "bg-red-50 text-red-600"
                    : "bg-gray-50 text-gray-400"
              }`}
            >
              {isFilled ? "+" : "-"} {FIELD_LABELS[field] ?? field}
              {isRequired && !isFilled && " *"}
            </span>
          );
        })}
      </div>
    </div>
  );
}
