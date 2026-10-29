import React from "react";

const BADGE_STYLES = {
  // Common states
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  "Pending Review": "bg-amber-50 text-amber-700 border-amber-200",
  "In Progress": "bg-sky-50 text-sky-700 border-sky-200",
  Resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Rejected: "bg-rose-50 text-rose-700 border-rose-200",
  Missing: "bg-gray-100 text-gray-500 border-gray-200",
  Overdue: "bg-red-50 text-red-700 border-red-300 font-bold",
  // Payments
  Paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Unpaid: "bg-rose-50 text-rose-700 border-rose-200",
  // Approvals
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
  // Houses
  Occupied: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Vacant: "bg-gray-100 text-gray-700 border-gray-200",
  // Priorities
  Low: "bg-slate-100 text-slate-700 border-slate-200",
  Medium: "bg-blue-50 text-blue-700 border-blue-200",
  High: "bg-rose-50 text-rose-700 border-rose-200",
  Normal: "bg-slate-100 text-slate-700 border-slate-200",
  Important: "bg-amber-50 text-amber-700 border-amber-200",
  Urgent: "bg-rose-50 text-rose-700 border-rose-200",
  // User status
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactive: "bg-gray-100 text-gray-600 border-gray-200",
};

export default function Badge({ children, variant = "default", className = "" }) {
  const style = BADGE_STYLES[variant] || "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style} ${className}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status, className = "" }) {
  if (!status) return null;
  return (
    <Badge variant={status} className={className}>
      {status}
    </Badge>
  );
}
