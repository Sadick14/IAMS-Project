import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { useAppContext } from "../../../lib/context";
import { apiClient } from "../../../lib/api-client";
import { usePolling } from "../../../lib/hooks";
import { MessageSquare, Send, ArrowLeft, Plus, Search, X, Phone, Video, MoreVertical, CheckCircle2 } from "lucide-react";

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

function humanizeRole(role: string): string {
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function MessagesPanel({ preselectedRecipientId }: { preselectedRecipientId?: string }) {
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
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const preselectedHandledRef = useRef(false);

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
      }
    } catch (error) {
      console.error("Fetch messages error:", error);
    }
  }, [selectedThread]);

  useEffect(() => {
    apiClient.getMessageContacts().then((res) => {
      if (res.success) {
        const contactsList = Array.isArray(res.data) ? res.data : res.data?.contacts || [];
        if (contactsList.length > 0) {
          setContacts(contactsList.filter((c: any) => String(c.id) !== userId));
        } else {
          apiClient.getUsers().then((usersRes) => {
            if (usersRes.success) {
              setContacts(usersRes.data.filter((u: any) => String(u.id) !== userId));
            }
          });
        }
      }
    });
    fetchThreads();
  }, [userId, fetchThreads]);

  // When arriving from the students page with a pre-selected recipient
  useEffect(() => {
    if (!preselectedRecipientId || contacts.length === 0 || preselectedHandledRef.current) return;
    preselectedHandledRef.current = true;

    const existingThread = threads.find((t) =>
      t.participants?.some((p: any) => String(p.id) === preselectedRecipientId)
    );
    if (existingThread) {
      setSelectedThread(String(existingThread.id));
    } else {
      setNewForm((f) => ({ ...f, recipientId: preselectedRecipientId }));
      setShowNewConversation(true);
    }
  }, [preselectedRecipientId, contacts, threads]);

  useEffect(() => {
    if (selectedThread) {
      fetchMessages();
      apiClient.markThreadRead(selectedThread).then(() => fetchThreads());
    }
  }, [selectedThread, fetchMessages, fetchThreads]);

  usePolling(fetchThreads, 15_000, true);
  usePolling(fetchMessages, 5_000, !!selectedThread);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const filteredThreads = threads.filter(
    (t) =>
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      getThreadLabel(t).toLowerCase().includes(search.toLowerCase())
  );

  const currentThread = threads.find((t) => String(t.id) === selectedThread);

  const handleSend = async () => {
    if (!messageText.trim() || !selectedThread) return;
    const content = messageText;
    setMessageText("");
    
    // Optimistic UI update
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      senderId: userId,
      senderName: user?.name || "Me",
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);

    const res = await apiClient.sendMessage(selectedThread, { content });
    if (!res.success) {
      toast.error("Failed to send message");
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } else {
      fetchMessages();
      fetchThreads();
    }
  };

  const handleNewConversation = async () => {
    if (!newForm.recipientId || !newForm.subject.trim() || !newForm.message.trim()) return;
    setLoading(true);
    try {
      const res = await apiClient.createThread({
        recipient_id: Number(newForm.recipientId),
        subject: newForm.subject,
        message: newForm.message,
      } as any);
      
      if (res.success && res.data?.threadId) {
        setSelectedThread(String(res.data.threadId));
        setShowNewConversation(false);
        setNewForm({ recipientId: "", subject: "", message: "" });
        toast.success("Conversation started!");
        fetchThreads();
      } else {
        toast.error(res.message || "Failed to create conversation");
      }
    } catch (e) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => name?.split(" ").map((w) => w[0]).join("").slice(0, 2) || "?";

  function getThreadLabel(thread: Thread) {
    const other = thread.participants?.find((p: any) => String(p.id) !== userId);
    return other?.name ?? thread.subject ?? "Conversation";
  }

  function getThreadRole(thread: Thread) {
    const other = thread.participants?.find((p: any) => String(p.id) !== userId);
    return other?.role ? humanizeRole(other.role) : "";
  }

  return (
    <div className="flex h-full overflow-hidden bg-gradient-to-b from-emerald-50/50 to-transparent dark:from-emerald-950/20 dark:to-transparent">
      {/* Thread List Sidebar */}
      <div className={`w-full md:w-80 lg:w-96 border-r border-border flex flex-col shrink-0 bg-white dark:bg-gray-900 ${selectedThread ? "hidden md:flex" : "flex"}`}>
        <div className="p-4 space-y-4 border-b border-border bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold">Chats</h2>
            </div>
            <button
              onClick={() => setShowNewConversation(true)}
              className="p-2.5 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 shadow-sm transition-all"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats..."
              className="w-full pl-10 pr-4 py-2.5 bg-muted/50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
              style={{ fontSize: "0.85rem" }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredThreads.length === 0 ? (
            <div className="p-10 text-center space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <MessageSquare className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">No messages yet</p>
                <p className="text-xs text-muted-foreground mt-1">Start a conversation with your supervisor or student</p>
              </div>
              <button
                onClick={() => setShowNewConversation(true)}
                className="px-4 py-2 bg-emerald-500/10 text-emerald-600 rounded-lg hover:bg-emerald-500/20 text-sm font-semibold transition-all"
              >
                New Chat
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filteredThreads.map((thread) => {
                const label = getThreadLabel(thread);
                const role = getThreadRole(thread);
                const isActive = selectedThread === String(thread.id);
                return (
                  <button
                    key={thread.id}
                    onClick={() => setSelectedThread(String(thread.id))}
                    className={`w-full text-left p-4 hover:bg-muted/50 transition-all relative ${
                      isActive ? "bg-emerald-50/80 dark:bg-emerald-950/30 after:absolute after:left-0 after:top-0 after:bottom-0 after:w-1 after:bg-emerald-500" : ""
                    }`}
                  >
                    <div className="flex gap-3 items-center">
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-bold">
                          {getInitials(label)}
                        </div>
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-bold text-sm truncate pr-2 text-foreground">{label}</span>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {new Date(thread.lastTimestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded-md text-muted-foreground font-semibold">{role}</span>
                          <span className="text-[10px] text-emerald-600 font-semibold truncate">{thread.subject}</span>
                        </div>
                        <p className={`text-xs truncate ${thread.unreadCount > 0 ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                          {thread.lastMessage}
                        </p>
                      </div>
                      {thread.unreadCount > 0 && (
                        <div className="shrink-0 flex items-center">
                          <span className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm">
                            {thread.unreadCount}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Message Window Area */}
      <div className={`flex-1 flex flex-col relative bg-gradient-to-b from-emerald-50/30 to-transparent dark:from-emerald-950/10 dark:to-transparent ${!selectedThread ? "hidden md:flex" : "flex"}`}>
        {!selectedThread ? (
          <div className="flex-1 flex items-center justify-center p-10 text-center bg-white dark:bg-gray-900">
            <div className="max-w-xs space-y-4">
              <div className="w-24 h-24 bg-emerald-50/50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto">
                <MessageSquare className="w-12 h-12 text-emerald-500/60" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-foreground">Your Messages</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Send secure messages to your academic or industrial supervisors and keep track of your attachment progress.
                </p>
              </div>
              <button
                onClick={() => setShowNewConversation(true)}
                className="px-6 py-3 bg-emerald-500 text-white rounded-full hover:shadow-lg hover:bg-emerald-600 transition-all font-semibold"
              >
                Start a New Chat
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-border flex items-center justify-between px-4 bg-white dark:bg-gray-900/90 backdrop-blur-sm sticky top-0 z-10">
              <div className="flex items-center gap-3 min-w-0">
                <button 
                  onClick={() => setSelectedThread(null)} 
                  className="md:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-bold shrink-0">
                  {currentThread ? getInitials(getThreadLabel(currentThread)) : ""}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold truncate leading-tight text-foreground">
                    {currentThread ? getThreadLabel(currentThread) : ""}
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                      {getThreadRole(currentThread!)} • Active
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"><Phone className="w-4.5 h-4.5" /></button>
                <button className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"><Video className="w-4.5 h-4.5" /></button>
                <button className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"><MoreVertical className="w-4.5 h-4.5" /></button>
              </div>
            </div>

            {/* Chat Messages */}
            <div 
              ref={scrollRef} 
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6"
              style={{
                backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.02) 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }}
            >
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center p-8 bg-white dark:bg-gray-900 border border-border rounded-2xl shadow-sm max-w-xs">
                    <p className="text-sm font-semibold text-foreground">No messages yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Be the first to say hello!</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {messages.map((msg, idx) => {
                    const isMine = String(msg.senderId) === userId;
                    const showAvatar = !isMine && (idx === 0 || String(messages[idx-1].senderId) !== String(msg.senderId));
                    
                    return (
                      <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"} items-end gap-2`}>
                        {!isMine && (
                          <div className={`w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-[10px] font-bold text-emerald-700 dark:text-emerald-300 shrink-0 transition-opacity ${showAvatar ? "opacity-100" : "opacity-0"}`}>
                            {getInitials(msg.senderName)}
                          </div>
                        )}
                        <div className={`flex flex-col space-y-1 max-w-[88%] sm:max-w-[75%]`}>
                          {showAvatar && (
                            <span className="text-[10px] font-bold text-muted-foreground ml-1 uppercase tracking-tight">
                              {msg.senderName}
                            </span>
                          )}
                          <div
                            className={`px-4 py-2.5 shadow-sm transition-all rounded-2xl ${
                              isMine 
                                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-br-md" 
                                : "bg-white dark:bg-gray-800 border border-border text-foreground rounded-bl-md"
                            }`}
                          >
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          <div className={`flex items-center gap-1.5 ${isMine ? "justify-end pr-1" : "pl-1"}`}>
                            <span className="text-[9px] text-muted-foreground font-semibold">
                              {new Date(msg.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {isMine && <CheckCircle2 className="w-3 h-3 text-white/70" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-3 sm:p-4 bg-white dark:bg-gray-900 border-t border-border">
              <div className="max-w-4xl mx-auto flex items-end gap-2 bg-muted/40 p-1.5 rounded-2xl border border-border/50 focus-within:border-emerald-500/50 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
                <button className="p-2.5 text-muted-foreground hover:text-emerald-500 transition-colors"><Plus className="w-5 h-5" /></button>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Message..."
                  rows={1}
                  className="flex-1 min-w-0 bg-transparent border-none focus:ring-0 py-2.5 px-1 text-sm resize-none min-h-[40px] max-h-[120px]"
                />
                <button
                  onClick={handleSend}
                  disabled={!messageText.trim()}
                  className={`p-2.5 rounded-xl transition-all ${
                    messageText.trim() 
                      ? "bg-emerald-500 text-white shadow-md hover:scale-105 active:scale-95" 
                      : "text-muted-foreground opacity-50 cursor-not-allowed"
                  }`}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[10px] text-center text-muted-foreground mt-2">
                Press Enter to send, Shift + Enter for new line
              </p>
            </div>
          </>
        )}
      </div>

      {/* New Conversation Dialog */}
      {showNewConversation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowNewConversation(false)}>
          <div className="bg-white dark:bg-gray-900 border border-border rounded-3xl w-full max-w-md shadow-xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">New Message</h2>
                    <p className="text-xs opacity-90">Start a conversation with a contact</p>
                  </div>
                </div>
                <button onClick={() => setShowNewConversation(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-5 h-5" /></button>
              </div>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Recipient</label>
                <select
                  value={newForm.recipientId}
                  onChange={(e) => setNewForm({ ...newForm, recipientId: e.target.value })}
                  className="w-full px-4 py-3 bg-muted/50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                >
                  <option value="">Select a contact...</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={String(c.id)}>{c.name} — {humanizeRole(c.role ?? "")}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Subject</label>
                <input 
                  type="text" 
                  value={newForm.subject} 
                  onChange={(e) => setNewForm({ ...newForm, subject: e.target.value })} 
                  placeholder="What is this about?" 
                  className="w-full px-4 py-3 bg-muted/50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Initial Message</label>
                <textarea 
                  value={newForm.message} 
                  onChange={(e) => setNewForm({ ...newForm, message: e.target.value })} 
                  placeholder="Write your message here..." 
                  className="w-full px-4 py-3 bg-muted/50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm min-h-[120px] resize-none" 
                />
              </div>
            </div>

            <div className="p-6 pt-0 flex gap-3">
              <button 
                onClick={() => setShowNewConversation(false)} 
                className="flex-1 py-3 border border-border rounded-xl hover:bg-muted font-bold text-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleNewConversation}
                disabled={!newForm.recipientId || !newForm.subject.trim() || !newForm.message.trim() || loading}
                className="flex-[2] py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
