import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { GradingConfigForm } from "../../components/grading/grading-config-form";
import { useAppContext } from "../../lib/context";
import { apiClient } from "../../lib/api-client";
import { DEFAULT_STRUCTURE, DEFAULT_STRUCTURE_WEIGHTS, DEFAULT_SECTION_WEIGHTS } from "../../lib/constants";
import type { GradingActor } from "../../types/grading";
import { CheckCircle2, Loader2 } from "lucide-react";

export function HODGradingConfigPage() {
  const { user } = useAppContext();
  const department = user?.department ?? "Computer Science";
  
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);

  const fetchConfig = async () => {
    setLoading(true);
    const res = await apiClient.getGradingConfigs({ department });
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
  }, [department]);

  const actor: GradingActor = {
    id: user?.id ?? "u-hod",
    name: user?.name ?? "HOD",
    role: "hod",
    department,
  };

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
            Read-only view of {department}'s grading configuration. Approve a pending submission to lock it for the term.
          </p>
        </div>
        <StatusBadge status={config?.status ?? "draft"} />
      </div>

      <Card className="p-4 text-sm text-gray-600">
        <div>
          <span className="text-gray-500">Drafted by:</span> {config?.createdBy ?? "N/A"}
        </div>
        {config?.submittedForApprovalBy && (
          <div className="mt-1">
            <span className="text-gray-500">Submitted for approval by:</span>{" "}
            {config.submittedForApprovalBy} · {config.submittedForApprovalAt && new Date(config.submittedForApprovalAt).toLocaleString()}
          </div>
        )}
        {config?.approvedBy && (
          <div className="mt-1">
            <span className="text-gray-500">Approved by:</span>{" "}
            {config.approvedBy} · {config.approvedAt && new Date(config.approvedAt).toLocaleString()}
          </div>
        )}
      </Card>

      <Card className="p-6">
        {config ? (
          <GradingConfigForm initial={config} readOnly />
        ) : (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            No configuration available for your department.
          </div>
        )}
      </Card>

      {config?.status === "pending_approval" && (
        <div className="flex justify-end">
          <Button
            className="bg-[#0B5ED7] hover:bg-[#0a52bd]"
            disabled={isApproving}
            onClick={async () => {
              if (!config?.id) return;
              setIsApproving(true);
              const res = await apiClient.approveGradingConfig(config.id);
              if (res.success) {
                toast.success("Configuration approved and locked for the term.");
                fetchConfig();
              } else {
                toast.error(res.message ?? "Failed to approve configuration.");
              }
              setIsApproving(false);
            }}
          >
            {isApproving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="size-4 mr-2" />}
            Approve & Lock for Term
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
    draft: "Draft (not yet submitted)",
    pending_approval: "Pending Your Approval",
    active: "Active & Locked",
  };
  return <Badge className={map[status]}>{label[status]}</Badge>;
}
