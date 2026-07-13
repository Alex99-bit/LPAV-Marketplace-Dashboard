import Select from "@/components/ui/Select";
import { CRM_LEAD_STATUS_OPTIONS, CRM_PRIORITY_OPTIONS } from "@/lib/constants";

interface LeadFiltersProps {
  status: string;
  priority: string;
  onStatusChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
}

export default function LeadFilters({
  status,
  priority,
  onStatusChange,
  onPriorityChange,
}: LeadFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <div className="w-40">
        <Select
          options={[{ value: "", label: "Todos los estados" }, ...CRM_LEAD_STATUS_OPTIONS]}
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
        />
      </div>
      <div className="w-36">
        <Select
          options={[{ value: "", label: "Todas" }, ...CRM_PRIORITY_OPTIONS]}
          value={priority}
          onChange={(e) => onPriorityChange(e.target.value)}
        />
      </div>
    </div>
  );
}
