import { User, Package, Calendar } from "lucide-react";
import type { CRMLead } from "@/types";
import Badge from "@/components/ui/Badge";
import AIQualificationProgress from "@/components/crm/AIQualificationProgress";
import { CRM_LEAD_STATUS } from "@/lib/constants";
import { formatCurrency, formatRelativeTime } from "@/lib/formatters";

interface LeadCardProps {
  lead: CRMLead & {
    profiles?: { full_name: string | null } | null;
    travel_packages?: { title: string; region: string } | null;
  };
  onClick: () => void;
}

export default function LeadCard({ lead, onClick }: LeadCardProps) {
  const statusInfo = CRM_LEAD_STATUS[lead.status];
  const travelerName = (lead.profiles as { full_name: string | null } | null)?.full_name ?? "Viajero";
  const packageTitle = (lead.travel_packages as { title: string; region: string } | null)?.title ?? "Sin paquete";
  const packageRegion = (lead.travel_packages as { title: string; region: string } | null)?.region ?? "";

  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border border-gray-100 bg-white p-4 text-left transition-all hover:border-primary/20 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 shrink-0 text-text-muted" />
            <span className="truncate text-sm font-medium text-text">{travelerName}</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Package className="h-3.5 w-3.5 shrink-0 text-text-muted" />
            <span className="truncate text-xs text-text-muted">{packageTitle}</span>
            {packageRegion && (
              <span className="text-xs text-text-muted">- {packageRegion}</span>
            )}
          </div>
        </div>
        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-text-muted">
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          <span>{formatRelativeTime(lead.created_at)}</span>
        </div>
        {lead.estimated_budget > 0 && (
          <span className="font-medium text-text">
            {formatCurrency(lead.estimated_budget, lead.budget_currency)}
          </span>
        )}
      </div>

      {Object.keys(lead.ai_qualification_progress).length > 0 && (
        <div className="mt-3">
          <AIQualificationProgress fieldsExtracted={lead.ai_qualification_progress} />
        </div>
      )}
    </button>
  );
}
