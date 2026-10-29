import React, { useState, useEffect, useCallback } from "react";
import api from "../api/axios";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import { useToastContext } from "../components/layout/DashboardLayout";

const TYPE_ICONS = {
  complaint: "📋",
  payment: "💳",
  notice: "📢",
  account: "👤",
  general: "🔔",
};

export default function NotificationsPage() {
  const toast = useToastContext();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = useCallback(() => {
    setLoading(true);
    api
      .get("/notifications?limit=50")
      .then((r) => setNotifications(r.data.data.notifications || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchNotifs();
  }, [fetchNotifs]);

  const handleMarkRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch {
      toast?.error("Failed to mark notification as read.");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast?.success("All notifications marked as read.");
    } catch {
      toast?.error("Operation failed.");
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Activity Notifications</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread update(s)` : "All notifications read"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" onClick={handleMarkAllRead}>
            ✓ Mark All as Read
          </Button>
        )}
      </div>

      <Card padding={false}>
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8">
            <EmptyState icon="🔔" title="No notifications" description="You are fully up to date." />
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {notifications.map((n) => (
              <div
                key={n._id}
                onClick={() => !n.isRead && handleMarkRead(n._id)}
                className={`p-4 sm:p-5 flex items-start gap-3.5 transition-colors cursor-pointer ${
                  !n.isRead ? "bg-indigo-50/50 hover:bg-indigo-50" : "hover:bg-gray-50/60"
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-white border border-gray-100 shadow-xs flex items-center justify-center shrink-0 text-base">
                  {TYPE_ICONS[n.type] || "🔔"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs ${!n.isRead ? "font-bold text-gray-900" : "font-semibold text-gray-700"}`}>
                      {n.title}
                    </p>
                    <span className="text-[10px] text-gray-400">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">{n.message}</p>
                </div>
                {!n.isRead && (
                  <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1.5" />
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
