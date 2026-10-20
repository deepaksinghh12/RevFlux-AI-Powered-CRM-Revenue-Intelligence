import { useEffect, useState, useMemo } from "react";
import {
  Trash2,
  RotateCcw,
  Search,
  AlertTriangle,
  Clock,
  Users,
  Contact2,
  CalendarCheck,
  StickyNote,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../components/common/PageHeader";
import { EmptyState } from "../components/common/EmptyState";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import {
  Card,
  Button,
  Badge,
  Spinner,
} from "../components/ui";
import { trashApi } from "../lib/services";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";

const TABS = [
  { key: "all", label: "All Items" },
  { key: "lead", label: "Leads", icon: Users },
  { key: "contact", label: "Contacts", icon: Contact2 },
  { key: "task", label: "Follow-ups", icon: CalendarCheck },
  { key: "note", label: "Notes", icon: StickyNote },
];

const ENTITY_TYPE_LABELS = {
  lead: { label: "Lead", icon: Users, color: "text-blue-700 bg-blue-50 border-blue-200" },
  contact: { label: "Contact", icon: Contact2, color: "text-purple-700 bg-purple-50 border-purple-200" },
  task: { label: "Task", icon: CalendarCheck, color: "text-amber-700 bg-amber-50 border-amber-200" },
  note: { label: "Note", icon: StickyNote, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
};

export default function Trash() {
  const { activeOrg } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Action states
  const [restoringId, setRestoringId] = useState(null);
  const [purgeTarget, setPurgeTarget] = useState(null);
  const [purging, setPurging] = useState(false);

  const userRole = activeOrg?.role || "rep";
  const canPurge = ["owner", "admin"].includes(userRole);

  const fetchTrash = async () => {
    try {
      setLoading(true);
      const res = await trashApi.list();
      setItems(res?.items || []);
    } catch (err) {
      toast.error("Failed to load trash items", { description: err.message });
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, [activeOrg?.id]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesTab = selectedTab === "all" || item.entityType === selectedTab;
      const matchesSearch =
        !searchQuery.trim() ||
        (item.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.subtitle || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [items, selectedTab, searchQuery]);

  const handleRestore = async (item) => {
    try {
      setRestoringId(item.id);
      await trashApi.restore(item.entityType, item.id);
      toast.success(`${item.title || "Record"} restored successfully.`);
      // Refresh list
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err) {
      toast.error("Could not restore item", { description: err.message });
    } finally {
      setRestoringId(null);
    }
  };

  const handleConfirmPurge = async () => {
    if (!purgeTarget) return;
    try {
      setPurging(true);
      await trashApi.purge(purgeTarget.entityType, purgeTarget.id);
      toast.success(`${purgeTarget.title || "Record"} permanently deleted.`);
      setItems((prev) => prev.filter((i) => i.id !== purgeTarget.id));
      setPurgeTarget(null);
    } catch (err) {
      toast.error("Could not permanently delete item", { description: err.message });
    } finally {
      setPurging(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Trash & Recovery"
        subtitle="Recover deleted records within the guaranteed 30-day retention window before permanent automated purge."
      />

      {/* Info Banner */}
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface-muted/60 p-4 text-xs text-ink-soft">
        <Clock className="h-5 w-5 shrink-0 text-brand-600" />
        <div>
          <span className="font-semibold text-ink">30-Day Guaranteed Recovery Window: </span>
          Soft-deleted leads, contacts, tasks, and notes are preserved for 30 days. Restoring a lead automatically recovers associated notes that were deleted with it.
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface p-1">
          {TABS.map((tab) => {
            const count = tab.key === "all" ? items.length : items.filter((i) => i.entityType === tab.key).length;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setSelectedTab(tab.key)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition",
                  selectedTab === tab.key
                    ? "bg-brand-50 text-brand-700 shadow-xs"
                    : "text-ink-soft hover:bg-surface-muted hover:text-ink"
                )}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-[10px]",
                    selectedTab === tab.key ? "bg-brand-200/60 text-brand-800" : "bg-surface-muted text-ink-muted"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search trash..."
            className="w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-3 text-xs text-ink placeholder:text-ink-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Main List */}
      <Card className="overflow-hidden border-line">
        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-ink-soft">
            <Spinner size="md" />
            <span className="text-xs">Loading trash items...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={Trash2}
            title={searchQuery ? "No matching deleted records" : "Trash is empty"}
            description={
              searchQuery
                ? "Try searching with different terms or check another tab."
                : "No items have been deleted in this workspace within the last 30 days."
            }
          />
        ) : (
          <div className="divide-y divide-line">
            {filteredItems.map((item) => {
              const meta = ENTITY_TYPE_LABELS[item.entityType] || {
                label: item.entityType,
                color: "text-slate-700 bg-slate-50 border-slate-200",
              };
              const Icon = meta.icon || Trash2;
              const isUrgent = item.daysRemaining <= 5;

              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-surface-muted/40 transition"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-xs",
                        meta.color
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs text-ink truncate">
                          {item.title}
                        </span>
                        <Badge variant="outline" className={cn("text-[10px] capitalize", meta.color)}>
                          {meta.label}
                        </Badge>
                        {item.status && (
                          <Badge variant="neutral" className="text-[10px]">
                            {item.status}
                          </Badge>
                        )}
                      </div>

                      {item.subtitle && (
                        <p className="text-[11px] text-ink-muted truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      )}

                      <div className="mt-1 flex items-center gap-3 text-[10px] text-ink-muted">
                        <span>
                          Deleted on {new Date(item.deletedAt).toLocaleDateString()}
                        </span>
                        <span>&bull;</span>
                        <span
                          className={cn(
                            "font-medium",
                            isUrgent ? "text-rose-600 font-semibold" : "text-amber-600"
                          )}
                        >
                          {item.daysRemaining} {item.daysRemaining === 1 ? "day" : "days"} left
                        </span>
                        {item.owner?.name && (
                          <>
                            <span>&bull;</span>
                            <span>Owner: {item.owner.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Controls */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(item)}
                      disabled={restoringId === item.id}
                      className="text-xs gap-1.5 border-line hover:border-brand-500 hover:text-brand-700"
                    >
                      {restoringId === item.id ? (
                        <Spinner size="xs" />
                      ) : (
                        <RotateCcw className="h-3.5 w-3.5 text-brand-600" />
                      )}
                      <span>Restore</span>
                    </Button>

                    {canPurge && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPurgeTarget(item)}
                        className="text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 gap-1.5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Purge</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Permanent Purge Confirmation Modal */}
      <ConfirmDialog
        open={Boolean(purgeTarget)}
        onClose={() => setPurgeTarget(null)}
        onConfirm={handleConfirmPurge}
        loading={purging}
        title="Permanently Purge Record?"
        description={`Are you sure you want to permanently delete "${purgeTarget?.title || "this item"}"? This action cannot be undone and will immediately wipe all associated data.`}
        confirmLabel="Purge Permanently"
      />
    </div>
  );
}
