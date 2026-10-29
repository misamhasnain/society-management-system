import React from "react";

export default function LoadingSpinner({ size = "md", className = "" }) {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-7 h-7",
    lg: "w-10 h-10",
  };

  return (
    <svg
      className={`animate-spin text-indigo-600 ${sizes[size] || sizes.md} ${className}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function PageLoader() {
  return (
    <div className="min-h-[300px] flex flex-col items-center justify-center p-8 text-center">
      <LoadingSpinner size="lg" />
      <p className="mt-3 text-sm font-medium text-gray-500">Loading society data...</p>
    </div>
  );
}
