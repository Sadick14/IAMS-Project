import { useState, useEffect, useRef, useCallback } from "react";
import { useAppContext } from "../../../lib/context";
import { apiClient } from "../../../lib/api-client";
import { usePolling } from "../../../lib/hooks";
import { MessageSquare, Send, ArrowLeft, Plus, Search, X, Paperclip, Phone, Video, MoreVertical } from "lucide-react";

interface Thread {
  id: string | number;
  subject: string;
  lastMessage: string;
  lastTimestamp: string;
  unreadCount: number;
  participants?: any[];
}

interface Message {
  id: string | number;
  senderId: string | number;
  senderName: string;
  senderRole?: string;
  content: string;
  timestamp: string;
}

interface NewConversationForm {
  recipientId: string;
  subject: string;
  message: string;
}

export function MessagesPanel() {
  const { user } = useAppContext();
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [search, setSearch] = useState("");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [newForm, setNewForm] = useState<NewConversationForm>({ recipientId: "", subject: "", message: "" });
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const userId = String(user?.id || "");

  const fetchThreads = useCallback(async () => {
    try {
      const res = await apiClient.getThreads(userId);
      if (res.success) {
        setThreads(res.data);
        setApiAvailable(true);
      } else if (apiAvailable === null) {
        setApiAvailable(false);
      }
    } catch {
      if (apiAvailable === null) setApiAvailable(false);
    }
  }, [userId, apiAvailable]);

  const fetchMessages = useCallback(async () => {
    if (!selectedThread) return;
    try {
      const res = await apiClient.getMessages(selectedThread);
      if (res.success) {
        setMessages(res.data);
        setApiAvailable(true);
      } else if (apiAvailable === null) {
        setApiAvailable(false);
      }
    } catch {
      if (apiAvailable === null) setApiAvailable(false);
    }
  }, [selectedThread, apiAvailable]);

  useEffect(() => {
    apiClient.getUsers().then((res) => {
      if (res.success) setContacts(res.data.filter((u: any) => String(u.id) !== userId));
    });
  }, [userId]);

  useEffect(() => {
    if (selectedThread) {
      fetchMessages();
      apiClient.markThreadRead(selectedThread).then(() => fetchThreads());
    }
  }, [selectedThread, fetchMessages, fetchThreads]);

  usePolling(fetchThreads, 30_000, true);
  usePolling(fetchMessages, 15_000, !!selectedThread);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const filteredThreads = threads.filter(
    (t) =>
      t.subject.toLowerCase().includes(search.toLowerCase())
  );

  const currentThread = threads.find((t) => String(t.id) === selectedThread);

  const handleSend = async () => {
    if (!messageText.trim() || !selectedThread) return;
    await apiClient.sendMessage(selectedThread, { content: messageText });
    setMessageText("");
    const res = await apiClient.getMessages(selectedThread);
    if (res.success) setMessages(res.data);
    fetchThreads();
  };

  const handleNewConversation = async () => {
    if (!newForm.recipientId || !newForm.subject.trim() || !newForm.message.trim()) return;
    const res = await apiClient.createThread({
      recipient_id: Number(newForm.recipientId),
      subject: newForm.subject,
      message: newForm.message,
    } as any);
    setShowNewConversation(false);
    setNewForm({ recipientId: "", subject: "", message: "" });
    if (res.success && res.data?.threadId) {
      setSelectedThread(String(res.data.threadId));
    }
    fetchThreads();
  };

  const getInitials = (name: string) => name?.split(" ").map((w) => w[0]).join("").slice(0, 2) || "?";

  const getThreadLabel = (thread: Thread) => {
    const other = thread.participants?.find((p: any) => String(p.id) !== userId);
    return other?.name ?? thread.subject ?? "Conversation";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
          {threads.length} conversation{threads.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() => setShowNewConversation(true)}
          className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2"
          style={{ fontSize: "0.8rem" }}
        >
          <Plus className="w-3.5 h-3.5" /> New Message
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col md:flex-row" style={{ height: "calc(100vh - 310px)", minHeight: "400px" }}>
        {/* Thread List */}
        <div className={`w-full md:w-80 border-b md:border-b-0 md:border-r border-border flex flex-col shrink-0 ${selectedThread ? "hidden md:flex" : "flex"}`}>
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-9 pr-3 py-2 border border-border rounded-lg bg-background"
                style={{ fontSize: "0.85rem" }}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredThreads.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
                  {search ? "No matching conversations" : "No conversations yet"}
                </p>
                <button
                  onClick={() => setShowNewConversation(true)}
                  className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2 mx-auto"
                  style={{ fontSize: "0.85rem" }}
                >
                  <Plus className="w-4 h-4" /> Start One
                </button>
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const label = getThreadLabel(thread);
                return (
                  <button
                    key={thread.id}
                    onClick={() => setSelectedThread(String(thread.id))}
                    className={`w-full text-left p-4 border-b border-border hover:bg-accent transition-colors ${
                      selectedThread === String(thread.id) ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0" style={{ fontSize: "0.75rem" }}>
                        {getInitials(label)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span style={{ fontSize: "0.85rem" }} className="text-foreground truncate">{label}</span>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            {thread.unreadCount > 0 && (
                              <span className="w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center" style={{ fontSize: "0.6rem" }}>
                                {thread.unreadCount}
                              </span>
                            )}
                            <span className="text-muted-foreground" style={{ fontSize: "0.65rem" }}>
                              {new Date(thread.lastTimestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            </span>
                          </div>
                        </div>
                        <p className="text-primary" style={{ fontSize: "0.75rem" }}>{thread.subject}</p>
                        <p className="text-muted-foreground truncate mt-0.5" style={{ fontSize: "0.75rem" }}>{thread.lastMessage}</p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Message Area */}
        <div className={`flex-1 flex flex-col ${!selectedThread ? "hidden md:flex" : "flex"}`}>
          {!selectedThread ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3>Select a conversation</h3>
                <p className="text-muted-foreground mt-1" style={{ fontSize: "0.85rem" }}>
                  Choose a thread from the left to view messages.
                </p>
                <button
                  onClick={() => setShowNewConversation(true)}
                  className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2 mx-auto"
                  style={{ fontSize: "0.85rem" }}
                >
                  <Plus className="w-4 h-4" /> New Conversation
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Thread Header */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setSelectedThread(null)} className="md:hidden text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary" style={{ fontSize: "0.75rem" }}>
                    {currentThread ? getInitials(getThreadLabel(currentThread)) : ""}
                  </div>
                  <div>
                    <p style={{ fontSize: "0.9rem" }} className="text-foreground">
                      {currentThread ? getThreadLabel(currentThread) : ""}
                    </p>
                    <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                      {currentThread?.subject}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button className="p-2 rounded-lg hover:bg-accent text-muted-foreground" title="Voice call"><Phone className="w-4 h-4" /></button>
                  <button className="p-2 rounded-lg hover:bg-accent text-muted-foreground" title="Video call"><Video className="w-4 h-4" /></button>
                  <button className="p-2 rounded-lg hover:bg-accent text-muted-foreground" title="More"><MoreVertical className="w-4 h-4" /></button>
                </div>
              </div>

              {/* Messages */}
              {apiAvailable === false ? (
                <div className="flex-1 flex items-center justify-center p-8 text-center">
                  <div>
                    <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-muted-foreground" style={{ fontSize: "0.9rem" }}>
                      Messaging is coming soon
                    </p>
                    <p className="text-muted-foreground mt-1" style={{ fontSize: "0.8rem" }}>
                      The messaging feature is being set up. Check back shortly.
                    </p>
                  </div>
                </div>
              ) : (
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>No messages yet. Start the conversation!</p>
                    </div>
                  )}
                  {messages.map((msg) => {
                  const isMine = String(msg.senderId) === userId;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                      {!isMine && (
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground mr-2 shrink-0 mt-auto" style={{ fontSize: "0.6rem" }}>
                          {getInitials(msg.senderName)}
                        </div>
                      )}
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                          isMine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary text-secondary-foreground rounded-bl-md"
                        }`}
                      >
                        {!isMine && (
                          <p style={{ fontSize: "0.7rem" }} className="opacity-75 mb-1">{msg.senderName}{msg.senderRole ? ` · ${msg.senderRole}` : ""}</p>
                        )}
                        <p style={{ fontSize: "0.85rem" }}>{msg.content}</p>
                        <p style={{ fontSize: "0.65rem" }} className={`mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                          {new Date(msg.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                </div>
              )}

              {/* Input */}
              <div className="p-4 border-t border-border">
                <div className="flex gap-2 items-end">
                  <button className="p-2.5 rounded-lg border border-border hover:bg-accent text-muted-foreground shrink-0" title="Attach file">
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2.5 border border-border rounded-lg bg-background"
                    style={{ fontSize: "0.85rem" }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!messageText.trim()}
                    className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2 shrink-0"
                    style={{ fontSize: "0.85rem" }}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* New Conversation Modal */}
      {showNewConversation && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowNewConversation(false)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="flex items-center gap-2"><MessageSquare className="w-5 h-5 text-primary" /> New Conversation</h2>
              <button onClick={() => setShowNewConversation(false)} className="p-1 rounded-md hover:bg-accent"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label style={{ fontSize: "0.8rem" }}>Recipient</label>
                <select
                  value={newForm.recipientId}
                  onChange={(e) => setNewForm({ ...newForm, recipientId: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background"
                  style={{ fontSize: "0.85rem" }}
                >
                  <option value="">Select a contact...</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={String(c.id)}>{c.name} — {c.role}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "0.8rem" }}>Subject</label>
                <input type="text" value={newForm.subject} onChange={(e) => setNewForm({ ...newForm, subject: e.target.value })} placeholder="e.g., Logbook Review Request" className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background" style={{ fontSize: "0.85rem" }} />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem" }}>Message</label>
                <textarea value={newForm.message} onChange={(e) => setNewForm({ ...newForm, message: e.target.value })} placeholder="Write your message..." className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background min-h-[100px]" style={{ fontSize: "0.85rem" }} />
              </div>
            </div>
            <div className="p-4 border-t border-border flex gap-2 justify-end">
              <button onClick={() => setShowNewConversation(false)} className="px-4 py-2 border border-border rounded-lg hover:bg-accent" style={{ fontSize: "0.85rem" }}>Cancel</button>
              <button
                onClick={handleNewConversation}
                disabled={!newForm.recipientId || !newForm.subject.trim() || !newForm.message.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                style={{ fontSize: "0.85rem" }}
              >
                <Send className="w-4 h-4" /> Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
