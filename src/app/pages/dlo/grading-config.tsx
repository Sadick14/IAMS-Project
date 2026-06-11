import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { GradingConfigForm } from "../../components/grading/grading-config-form";
import { useAppContext } from "../../lib/context";
import { apiClient } from "../../lib/api-client";
import { DEFAULT_STRUCTURE, DEFAULT_STRUCTURE_WEIGHTS, DEFAULT_SECTION_WEIGHTS } from "../../lib/constants";
import { Send, Loader2 } from "lucide-react";

export function DLOGradingConfigPage() {
  const { user } = useAppContext();
  const department = user?.department ?? "Computer Science";

  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTermId, setActiveTermId] = useState<string | number | undefined>(undefined);

  useEffect(() => {
    apiClient.getActiveTerm().then((res) => {
      if (res.success) setActiveTermId(res.data?.term?.id);
    });
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    const res = await apiClient.getGradingConfigs({ department, ...(activeTermId ? { term_id: activeTermId } : {}) });
    if (res.success && res.data.length > 0) {
      setConfig(res.data[0]);
    } else {
      setConfig({
        departmentId: department,
        structure: DEFAULT_STRUCTURE,
        structureWeights: DEFAULT_STRUCTURE_WEIGHTS,
        sectionWeights: DEFAULT_SECTION_WEIGHTS,
        status: "draft",
        updatedBy: "System",
        updatedAt: new Date().toISOString(),
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchConfig();
  }, [department, activeTermId]);

  const isLocked = config?.status === "active";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl text-[#1a1a2e]">Grading Configuration</h1>
          <p className="text-sm text-gray-600 mt-1">
            Configure how attachment grades are calculated for {department}. The HOD must approve before it locks for the term.
          </p>
        </div>
        <StatusBadge status={config?.status ?? "draft"} />
      </div>

      {isLocked && (
        <Card className="p-4 border-emerald-200 bg-emerald-50">
          <p className="text-sm text-emerald-900">
            This configuration is locked for the active term. Changes are only possible at the start of a new term.
          </p>
        </Card>
      )}

      <Card className="p-6">
        <GradingConfigForm
          initial={config}
          readOnly={isLocked}
          onSave={async (input) => {
            const res = await apiClient.saveGradingConfig({
              department_id: department,
              ...input,
            });
            if (res.success) {
              setConfig(res.data);
              toast.success("Grading configuration draft saved.");
            } else {
              toast.error(res.message ?? "Failed to save draft.");
            }
          }}
        />
      </Card>

      {!isLocked && (
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            disabled={!config?.id || config?.status !== "draft" || isSubmitting}
            onClick={async () => {
              if (!config?.id) {
                toast.error("Save a draft before submitting for approval.");
                return;
              }
              setIsSubmitting(true);
              const res = await apiClient.submitGradingConfigForApproval(config.id);
              if (res.success) {
                toast.success("Configuration submitted to HOD for approval.");
                fetchConfig();
              } else {
                toast.error(res.message ?? "Failed to submit for approval.");
              }
              setIsSubmitting(false);
            }}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="size-4 mr-2" />}
            Submit to HOD for Approval
          </Button>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    pending_approval: "bg-yellow-100 text-yellow-800",
    active: "bg-emerald-100 text-emerald-800",
  };
  const label: Record<string, string> = {
    draft: "Draft",
    pending_approval: "Pending HOD Approval",
    active: "Active & Locked",
  };
  return <Badge className={map[status]}>{label[status]}</Badge>;
}
