import { REGIONS } from "@/lib/constants";
import Select from "@/components/ui/Select";

interface RegionFilterProps {
  value: string;
  onChange: (region: string) => void;
}

export default function RegionFilter({ value, onChange }: RegionFilterProps) {
  const options = REGIONS.map((r) => ({ value: r, label: r }));

  return (
    <Select
      label="Región"
      options={options}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Todas las regiones"
    />
  );
}
