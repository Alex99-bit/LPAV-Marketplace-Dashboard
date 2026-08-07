import { DEPARTURE_CITIES } from "@/lib/constants";
import Select from "@/components/ui/Select";

interface DepartureCityFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export default function DepartureCityFilter({ value, onChange }: DepartureCityFilterProps) {
  return (
    <Select
      label="Sale de"
      options={[
        { value: "", label: "Todas las ciudades" },
        ...DEPARTURE_CITIES.map((c) => ({ value: c, label: c })),
      ]}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Ciudad de salida"
    />
  );
}
