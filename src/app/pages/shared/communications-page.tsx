import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { Bell, MessageSquare, Megaphone, Search, Plus, Filter, MoreVertical } from "lucide-react";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const canComposeAnnouncements = viewRole === "clo" || viewRole === "dlo";
  const requestedTab = (searchParams.get("tab") as CommTab) || "messages";

  const [activeTab, setActiveTab] = useState<CommTab>(requestedTab);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadMsgs, setUnreadMsgs] = useState(0);

  useEffect(() => {
    // Sync active tab with search params
    if (requestedTab !== activeTab) {
      setActiveTab(requestedTab);
    }
  }, [requestedTab]);

  useEffect(() => {
    apiClient.getNotifications({ unread_only: true }).then((res) => {
      if (res.success) setUnreadNotifs(res.data.length);
    });
    // In a real app, we'd fetch unread messages count here
  }, []);

  const handleTabChange = (tab: CommTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] -m-4 md:-m-6 overflow-hidden bg-background">
      {/* Unified Chat App UI */}
      <div className="flex flex-1 overflow-hidden bg-card border-t border-border">
        {/* Left Sidebar - Navigation & Categories */}
        <div className="w-16 sm:w-20 border-r border-border bg-muted/30 flex flex-col items-center py-6 gap-6 shrink-0">
          <button
            onClick={() => handleTabChange("messages")}
            className={`relative p-3 rounded-xl transition-all ${
              activeTab === "messages"
                ? "bg-primary text-primary-foreground shadow-lg scale-110"
                : "text-muted-foreground hover:bg-muted"
            }`}
            title="Messages"
          >
            <MessageSquare className="w-6 h-6" />
            {unreadMsgs > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-card">
                {unreadMsgs}
              </span>
            )}
          </button>

          <button
            onClick={() => handleTabChange("notifications")}
            className={`relative p-3 rounded-xl transition-all ${
              activeTab === "notifications"
                ? "bg-primary text-primary-foreground shadow-lg scale-110"
                : "text-muted-foreground hover:bg-muted"
            }`}
            title="Notifications"
          >
            <Bell className="w-6 h-6" />
            {unreadNotifs > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-card">
                {unreadNotifs}
              </span>
            )}
          </button>

          <button
            onClick={() => handleTabChange("announcements")}
            className={`relative p-3 rounded-xl transition-all ${
              activeTab === "announcements"
                ? "bg-primary text-primary-foreground shadow-lg scale-110"
                : "text-muted-foreground hover:bg-muted"
            }`}
            title="Announcements"
          >
            <Megaphone className="w-6 h-6" />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-background">
          {activeTab === "messages" && (
            <div className="h-full">
              <MessagesPanel preselectedRecipientId={searchParams.get("recipient") ?? undefined} />
            </div>
          )}
          
          {activeTab === "notifications" && (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-border flex items-center justify-between bg-card">
                <div>
                  <h2 className="text-lg font-bold">Notifications</h2>
                  <p className="text-xs text-muted-foreground">Stay updated with system activities</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => apiClient.markAllNotificationsRead().then(() => setUnreadNotifs(0))}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Mark all as read
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 bg-muted/10">
                <NotificationsPanel />
              </div>
            </div>
          )}

          {activeTab === "announcements" && (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-border flex items-center justify-between bg-card">
                <div>
                  <h2 className="text-lg font-bold">Announcements</h2>
                  <p className="text-xs text-muted-foreground">General updates and information</p>
                </div>
                {canComposeAnnouncements && (
                  <p className="text-xs text-muted-foreground italic">Role: {viewRole.toUpperCase()} - Authorized to broadcast</p>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-4 bg-muted/10">
                <AnnouncementsPanel viewRole={viewRole} canCompose={canComposeAnnouncements} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}