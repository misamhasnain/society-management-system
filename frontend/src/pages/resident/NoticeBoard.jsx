import React, { useState, useEffect, useCallback } from "react";
import api from "../../api/axios";
import Card from "../../components/ui/Card";
import Badge, { StatusBadge } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";
import { useToastContext } from "../../components/layout/DashboardLayout";

export default function ResidentNoticeBoard() {
  const toast = useToastContext();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState("");
  const [acknowledgingId, setAcknowledgingId] = useState(null);

  const fetchNotices = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: 50 });
    if (priorityFilter) params.set("priority", priorityFilter);

    api
      .get(`/notices?${params}`)
      .then((r) => setNotices(r.data.data.notices || []))
      .catch(() => toast?.error("Failed to load notice board."))
      .finally(() => setLoading(false));
  }, [priorityFilter, toast]);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  const handleAcknowledge = async (noticeId) => {
    setAcknowledgingId(noticeId);
    try {
      await api.patch(`/notices/${noticeId}/acknowledge`);
      toast?.success("Notice marked as read & acknowledged.");
      // Optimistically update notice state
      setNotices((prev) =>
        prev.map((n) =>
          n._id === noticeId
            ? { ...n, isAcknowledged: true, acknowledgmentsCount: (n.acknowledgmentsCount || 0) + 1 }
            : n
        )
      );
    } catch (err) {
      toast?.error(err.response?.data?.message || "Failed to acknowledge notice.");
    } finally {
      setAcknowledgingId(null);
    }
  };

  const unreadCount = notices.filter((n) => !n.isAcknowledged).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Society Notice Board</h1>
          <p className="text-xs text-gray-500 mt-1">
            Official circulars, emergency announcements, maintenance schedules, and community events
          </p>
        </div>

        {unreadCount > 0 && (
          <div className="px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-2">
            <span>📢</span>
            <span>{unreadCount} unacknowledged circular{unreadCount > 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPriorityFilter("")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            priorityFilter === ""
              ? "bg-indigo-600 text-white shadow-xs"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          All Circulars
        </button>
        <button
          onClick={() => setPriorityFilter("Urgent")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            priorityFilter === "Urgent"
              ? "bg-rose-600 text-white shadow-xs"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          🚨 Urgent Only
        </button>
        <button
          onClick={() => setPriorityFilter("Important")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            priorityFilter === "Important"
              ? "bg-amber-600 text-white shadow-xs"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          ⚠️ Important
        </button>
        <button
          onClick={() => setPriorityFilter("Normal")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            priorityFilter === "Normal"
              ? "bg-slate-700 text-white shadow-xs"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          ℹ️ Regular
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : notices.length === 0 ? (
        <Card>
          <EmptyState
            icon="📢"
            title="Notice Board is Clear"
            description="There are no active notices or announcements at this time."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {notices.map((n) => (
            <Card key={n._id} className="relative overflow-hidden">
              {n.priority === "Urgent" && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-600" />
              )}
              {n.priority === "Important" && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-amber-500" />
              )}

              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <StatusBadge status={n.priority} />
                  <span className="text-xs text-gray-400">
                    Posted on {new Date(n.publishedAt || n.createdAt).toLocaleDateString()} by{" "}
                    <strong className="text-gray-700">{n.createdBy?.name || "Society Admin"}</strong>
                  </span>
                </div>

                {n.isAcknowledged ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span>✓</span> Read & Acknowledged
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="primary"
                    loading={acknowledgingId === n._id}
                    onClick={() => handleAcknowledge(n._id)}
                  >
                    ✓ Mark as Acknowledged
                  </Button>
                )}
              </div>

              <h2 className="text-lg font-bold text-gray-900 mt-2">{n.title}</h2>
              <p className="text-xs text-gray-600 mt-2.5 leading-relaxed whitespace-pre-wrap bg-slate-50/60 p-4 rounded-xl border border-gray-100">
                {n.content}
              </p>

              <div className="mt-3.5 flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-gray-100">
                <span>
                  👥 {n.acknowledgmentsCount || 0} resident{(n.acknowledgmentsCount || 0) === 1 ? "" : "s"} acknowledged
                </span>
                <span className="font-mono text-gray-400">ID: {n._id.slice(-6)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
