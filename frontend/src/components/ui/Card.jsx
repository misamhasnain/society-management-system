import React from "react";

export default function Card({ children, className = "", padding = true }) {
  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden ${
        padding ? "p-5 sm:p-6" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className = "" }) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5 ${className}`}>
      <div>
        <h3 className="text-base font-bold text-gray-900 tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
