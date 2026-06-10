import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { apiClient } from "../../../lib/api-client";
import { Bell, CheckCheck, Mail, Search, Archive, FileText, Building2, GraduationCap, AlertTriangle, Settings2, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export function NotificationsPanel() {
  const [allNotifications, setAllNotifications] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

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
        actionUrl: n.action_url ?? null,
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
    message: MessageSquare,
    internship_approved: GraduationCap,
    attendance_alert: AlertTriangle,
    info: Bell,
  };

  const typeColors: Record<string, string> = {
    application: "bg-blue-100 text-blue-700",
    company: "bg-emerald-100 text-emerald-700",
    grade: "bg-purple-100 text-purple-700",
    escalation: "bg-red-100 text-red-700",
    system: "bg-gray-100 text-gray-700",
    message: "bg-sky-100 text-sky-700",
    internship_approved: "bg-teal-100 text-teal-700",
    attendance_alert: "bg-orange-100 text-orange-700",
    info: "bg-indigo-100 text-indigo-700",
  };

  const typeBgColors: Record<string, string> = {
    application: "bg-blue-50",
    company: "bg-emerald-50",
    grade: "bg-purple-50",
    escalation: "bg-red-50",
    system: "bg-gray-50",
    message: "bg-sky-50",
    internship_approved: "bg-teal-50",
    attendance_alert: "bg-orange-50",
    info: "bg-indigo-50",
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
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
            style={{ fontSize: "0.8rem" }}
          >
            <CheckCheck className="w-4 h-4" /> Mark All Read
          </button>
          <button
            onClick={handleArchiveAll}
            className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg hover:bg-accent transition-colors"
            style={{ fontSize: "0.8rem" }}
          >
            <Archive className="w-3.5 h-3.5" /> Archive Read
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { key: "All", label: "All", count: notifications.length, color: "text-blue-600 bg-blue-50", icon: Bell },
          { key: "Unread", label: "Unread", count: unread, color: "text-red-600 bg-red-50", icon: Mail },
          { key: "message", label: "Messages", count: typeCounts["message"] || 0, color: "text-sky-600 bg-sky-50", icon: MessageSquare },
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
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-white dark:bg-gray-900 text-sm"
        />
      </div>

      {/* Notifications List */}
      <div className="space-y-6">
        {Object.entries(grouped).map(([dateLabel, items]) => (
          <div key={dateLabel}>
            <p className="text-muted-foreground mb-3 px-1 text-xs uppercase tracking-wide font-semibold">
              {dateLabel} · {items.length} notification{items.length !== 1 ? "s" : ""}
            </p>
            <div className="space-y-3">
              {items.map((n) => {
                const TypeIcon = typeIcons[n.type] || Bell;
                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.read) handleMarkRead(n.id);
                      if (n.actionUrl) navigate(n.actionUrl);
                    }}
                    className={`bg-white dark:bg-gray-900 border rounded-xl p-4 flex items-start gap-4 transition-all group shadow-sm ${
                      !n.read ? "border-blue-300 bg-blue-50/80 hover:bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30" : "border-border hover:bg-gray-50 dark:hover:bg-gray-800"
                    } ${n.actionUrl ? "cursor-pointer" : ""}`}
                  >
                    <div className={`w-10 h-10 rounded-xl ${typeBgColors[n.type] || "bg-gray-50"} flex items-center justify-center shrink-0`}>
                      <TypeIcon className={`w-5 h-5 ${!n.read ? "text-blue-600" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full capitalize ${typeColors[n.type] || "bg-gray-100 text-gray-600"} font-semibold`} style={{ fontSize: "0.7rem" }}>
                          {n.type}
                        </span>
                        {!n.read && <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 animate-pulse" />}
                        <span className="text-muted-foreground ml-auto text-xs">
                          {new Date(n.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-base font-medium text-foreground">{n.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {!n.read && (
                        <button onClick={() => handleMarkRead(n.id)} className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600" title="Mark as read">
                          <CheckCheck className="w-4.5 h-4.5" />
                        </button>
                      )}
                      <button onClick={() => handleArchive(n.id)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-muted-foreground" title="Archive">
                        <Archive className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
