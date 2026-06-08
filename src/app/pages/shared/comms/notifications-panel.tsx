import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../../lib/api-client";
import {
  Bell, CheckCheck, Mail, Search, Archive, FileText,
  Building2, GraduationCap, AlertTriangle, Settings2
} from "lucide-react";
import { toast } from "sonner";

export function NotificationsPanel() {
  const [allNotifications, setAllNotifications] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set());

  const fetchNotifications = useCallback(async () => {
    const res = await apiClient.getNotifications({ per_page: 100 });
    if (res.success) {
      setAllNotifications(res.data.map((n: any) => ({
        id: String(n.id),
        title: n.title ?? "Notification",
        message: n.message ?? "",
        type: n.type ?? "system",
        read: !!n.is_read,
        timestamp: n.created_at ?? new Date().toISOString(),
      })));
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const notifications = allNotifications.filter((n) => !archivedIds.has(n.id));
  const searched = search
    ? notifications.filter((n) =>
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.message.toLowerCase().includes(search.toLowerCase()))
    : notifications;

  const filtered = filter === "All"
    ? searched
    : filter === "Unread"
      ? searched.filter((n) => !n.read)
      : searched.filter((n) => n.type === filter);

  const handleMarkRead = async (id: string) => {
    setAllNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    await apiClient.markNotificationRead(id);
  };

  const handleMarkAllRead = async () => {
    setAllNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await apiClient.markAllNotificationsRead();
    toast.success("All notifications marked as read.");
  };

  const handleArchive = (id: string) => {
    setArchivedIds((prev) => new Set([...prev, id]));
    toast.success("Notification archived.");
  };

  const handleArchiveAll = () => {
    const readIds = notifications.filter((n) => n.read).map((n) => n.id);
    setArchivedIds((prev) => new Set([...prev, ...readIds]));
    toast.success(`${readIds.length} read notifications archived.`);
  };

  const unread = notifications.filter((n) => !n.read).length;

  const typeIcons: Record<string, typeof FileText> = {
    application: FileText,
    company: Building2,
    grade: GraduationCap,
    escalation: AlertTriangle,
    system: Settings2,
  };

  const typeColors: Record<string, string> = {
    application: "bg-blue-100 text-blue-700",
    company: "bg-emerald-100 text-emerald-700",
    grade: "bg-purple-100 text-purple-700",
    escalation: "bg-red-100 text-red-700",
    system: "bg-gray-100 text-gray-700",
  };

  const typeBgColors: Record<string, string> = {
    application: "bg-blue-50",
    company: "bg-emerald-50",
    grade: "bg-purple-50",
    escalation: "bg-red-50",
    system: "bg-gray-50",
  };

  // Group by date
  const groupByDate = (items: typeof filtered) => {
    const groups: Record<string, typeof items> = {};
    items.forEach((n) => {
      const date = new Date(n.timestamp);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      let key: string;
      if (date.toDateString() === today.toDateString()) key = "Today";
      else if (date.toDateString() === yesterday.toDateString()) key = "Yesterday";
      else key = date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

      if (!groups[key]) groups[key] = [];
      groups[key].push(n);
    });
    return groups;
  };

  const grouped = groupByDate(filtered);

  const typeCounts: Record<string, number> = {};
  notifications.forEach((n) => {
    typeCounts[n.type] = (typeCounts[n.type] || 0) + 1;
  });

  return (
    <div className="space-y-5">
      {/* Actions bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
          {unread > 0 ? `${unread} unread` : "All caught up"} · {notifications.length} total
        </p>
        <div className="flex gap-2">
          {notifications.some((n) => n.read) && (
            <button onClick={handleArchiveAll} className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg hover:bg-accent transition-colors" style={{ fontSize: "0.8rem" }}>
              <Archive className="w-3.5 h-3.5" /> Archive Read
            </button>
          )}
          {unread > 0 && (
            <button onClick={handleMarkAllRead} className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90" style={{ fontSize: "0.8rem" }}>
              <CheckCheck className="w-3.5 h-3.5" /> Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { key: "All", label: "All", count: notifications.length, color: "text-blue-600 bg-blue-50", icon: Bell },
          { key: "Unread", label: "Unread", count: unread, color: "text-red-600 bg-red-50", icon: Mail },
          { key: "application", label: "Applications", count: typeCounts["application"] || 0, color: "text-blue-600 bg-blue-50", icon: FileText },
          { key: "company", label: "Companies", count: typeCounts["company"] || 0, color: "text-emerald-600 bg-emerald-50", icon: Building2 },
          { key: "escalation", label: "Escalations", count: typeCounts["escalation"] || 0, color: "text-red-600 bg-red-50", icon: AlertTriangle },
        ].map((s) => (
          <button
            key={s.key}
            onClick={() => setFilter(filter === s.key ? "All" : s.key)}
            className={`bg-card border rounded-xl p-3 flex items-center gap-3 transition-all ${
              filter === s.key ? "border-primary ring-1 ring-primary" : "border-border hover:shadow-sm"
            }`}
          >
            <div className={`w-8 h-8 rounded-lg ${s.color} flex items-center justify-center`}>
              <s.icon className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="text-muted-foreground" style={{ fontSize: "0.65rem" }}>{s.label}</p>
              <p style={{ fontSize: "1.1rem" }}>{s.count}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notifications..."
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-card"
          style={{ fontSize: "0.85rem" }}
        />
      </div>

      {/* Notification List */}
      <div className="max-h-[600px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3>No notifications</h3>
            <p className="text-muted-foreground mt-1" style={{ fontSize: "0.85rem" }}>
              {search ? "No notifications match your search." : "You're all caught up!"}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
          {Object.entries(grouped).map(([dateLabel, items]) => (
            <div key={dateLabel}>
              <p className="text-muted-foreground mb-2 px-1" style={{ fontSize: "0.75rem" }}>
                {dateLabel} · {items.length} notification{items.length !== 1 ? "s" : ""}
              </p>
              <div className="space-y-2">
                {items.map((n) => {
                  const TypeIcon = typeIcons[n.type] || Bell;
                  return (
                    <div
                      key={n.id}
                      className={`bg-card border rounded-xl p-4 flex items-start gap-4 transition-all group ${
                        !n.read ? "border-primary/30 bg-primary/5 hover:bg-primary/10" : "border-border hover:bg-muted/20"
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-lg ${typeBgColors[n.type] || "bg-gray-50"} flex items-center justify-center shrink-0 mt-0.5`}>
                        <TypeIcon className={`w-4 h-4 ${!n.read ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded-full capitalize ${typeColors[n.type] || "bg-gray-100 text-gray-600"}`} style={{ fontSize: "0.65rem" }}>
                            {n.type}
                          </span>
                          {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                          <span className="text-muted-foreground ml-auto" style={{ fontSize: "0.7rem" }}>
                            {new Date(n.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p style={{ fontSize: "0.9rem" }} className="text-foreground">{n.title}</p>
                        <p style={{ fontSize: "0.8rem" }} className="text-muted-foreground mt-0.5">{n.message}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {!n.read && (
                          <button onClick={() => handleMarkRead(n.id)} className="p-1.5 rounded-md hover:bg-accent text-primary" title="Mark as read">
                            <CheckCheck className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => handleArchive(n.id)} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground" title="Archive">
                          <Archive className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  );
}
