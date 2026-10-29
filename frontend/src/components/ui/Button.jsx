import React from "react";
import LoadingSpinner from "./LoadingSpinner";

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  type = "button",
  className = "",
  onClick,
  ...props
}) {
  const VARIANTS = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 border-transparent shadow-sm",
    secondary: "bg-white text-gray-700 hover:bg-gray-50 border-gray-300 shadow-xs",
    danger: "bg-rose-600 text-white hover:bg-rose-700 border-transparent shadow-sm",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 border-transparent shadow-sm",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 border-transparent",
  };

  const SIZES = {
    sm: "px-2.5 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-base font-semibold",
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border font-medium transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed ${VARIANTS[variant] || VARIANTS.primary} ${SIZES[size] || SIZES.md} ${className}`}
      {...props}
    >
      {loading && <LoadingSpinner size="sm" className="text-current" />}
      {children}
    </button>
  );
}
