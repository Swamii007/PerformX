"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { notificationsApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Bell, CheckCheck, Target, ThumbsUp, RotateCcw, Unlock, Share2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  goal_id?: string;
  actor_name?: string;
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  goal_submitted:  { icon: Target,      color: "text-blue-600",   bg: "bg-blue-100 dark:bg-blue-900/40" },
  goal_approved:   { icon: ThumbsUp,    color: "text-emerald-600",bg: "bg-emerald-100 dark:bg-emerald-900/40" },
  goal_returned:   { icon: RotateCcw,   color: "text-red-600",    bg: "bg-red-100 dark:bg-red-900/40" },
  goal_unlocked:   { icon: Unlock,      color: "text-amber-600",  bg: "bg-amber-100 dark:bg-amber-900/40" },
  shared_goal:     { icon: Share2,      color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/40" },
  checkin_reminder:{ icon: Clock,       color: "text-slate-600",  bg: "bg-slate-100 dark:bg-slate-800" },
};

export function NotificationPopover() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const [notifRes, countRes] = await Promise.all([
        notificationsApi.getAll(20),
        notificationsApi.getUnreadCount(),
      ]);
      setNotifications(notifRes.data);
      setUnreadCount(countRes.data.count);
    } catch { /* not logged in yet */ }
  }, []);

  // Initial fetch + poll every 30s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleOpen = async () => {
    setOpen(prev => !prev);
    if (!open) {
      setLoading(true);
      await fetchNotifications();
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    await notificationsApi.markRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const formatTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return "recently";
    }
  };

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-11 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl z-50 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</h3>
              {unreadCount > 0 && (
                <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-3/4" />
                      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-full" />
                      <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                  <Bell className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">All caught up!</p>
                <p className="text-xs text-slate-400 mt-1">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => {
                const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.checkin_reminder;
                const Icon = cfg.icon;
                return (
                  <div
                    key={n.id}
                    onClick={() => !n.is_read && handleMarkRead(n.id)}
                    className={cn(
                      "flex gap-3 px-4 py-3 border-b border-slate-50 dark:border-slate-800/50 last:border-0 transition-colors",
                      !n.is_read
                        ? "bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/30"
                    )}
                  >
                    {/* Icon */}
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5", cfg.bg)}>
                      <Icon className={cn("w-4 h-4", cfg.color)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "text-sm leading-snug",
                          !n.is_read ? "font-semibold text-slate-900 dark:text-white" : "font-medium text-slate-700 dark:text-slate-300"
                        )}>
                          {n.title}
                        </p>
                        {!n.is_read && (
                          <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        {formatTime(n.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <p className="text-xs text-slate-400 text-center">
                Showing latest {notifications.length} notifications
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
