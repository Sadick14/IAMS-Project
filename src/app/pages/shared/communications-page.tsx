import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Bell, MessageSquare, Megaphone } from "lucide-react";
import { apiClient } from "../../lib/api-client";
import { NotificationsPanel } from "./comms/notifications-panel";
import { MessagesPanel } from "./comms/messages-panel";
import { AnnouncementsPanel } from "./comms/announcements-panel";
import type { ExtendedRole } from "../../services/auth-service";

type CommTab = "notifications" | "messages" | "announcements";

interface Props {
  viewRole: ExtendedRole;
}

export function CommunicationsPage({ viewRole }: Props) {
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as CommTab) ?? "notifications";
  const recipientParam = searchParams.get("recipient") ?? undefined;

  const [activeTab, setActiveTab] = useState<CommTab>(initialTab);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const unreadMsgs = 0;

  useEffect(() => {
    apiClient.getNotifications({ per_page: 50 }).then((res) => {
      if (res.success) setUnreadNotifs(res.data.filter((n: any) => !n.is_read).length);
    });
  }, []);

  // Only CLO/DLO can compose announcements; all roles can view them
  const canComposeAnnouncements = viewRole === "clo" || viewRole === "dlo";

  const tabs: { key: CommTab; label: string; icon: typeof Bell; badge?: number }[] = [
    { key: "notifications", label: "Notifications", icon: Bell, badge: unreadNotifs || undefined },
    { key: "messages", label: "Messages", icon: MessageSquare, badge: unreadMsgs || undefined },
    { key: "announcements", label: "Announcements", icon: Megaphone },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1>Communications</h1>
        <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
          Notifications, messages, and announcements — all in one place
        </p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-3 justify-center">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative flex items-center justify-center w-12 h-12 rounded-full transition-all sm:w-auto sm:h-auto sm:px-4 sm:py-2 sm:rounded-lg sm:gap-2 ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <tab.icon className="w-5 h-5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline" style={{ fontSize: "0.85rem" }}>{tab.label}</span>
            {tab.badge && tab.badge > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                style={{ fontSize: "0.6rem" }}
              >
                {tab.badge > 99 ? "99+" : tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "notifications" && <NotificationsPanel />}
      {activeTab === "messages" && <MessagesPanel preselectedRecipientId={recipientParam} />}
      {activeTab === "announcements" && <AnnouncementsPanel viewRole={viewRole} canCompose={canComposeAnnouncements} />}
    </div>
  );
}