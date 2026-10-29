import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const ADMIN_LINKS = [
  { to: "/admin/dashboard", label: "Dashboard", icon: "📊" },
  { to: "/admin/residents", label: "Residents", icon: "👥" },
  { to: "/admin/houses", label: "Houses & Units", icon: "🏡" },
  { to: "/admin/complaints", label: "Complaints", icon: "⚠️" },
  { to: "/admin/payments", label: "Maintenance Bills", icon: "💳" },
  { to: "/admin/notices", label: "Notice Board", icon: "📢" },
  { to: "/admin/visitors", label: "Visitor Gate Log", icon: "🚶" },
  { to: "/admin/reports", label: "Analytics & Reports", icon: "📈" },
  { to: "/admin/ai", label: "AI Society Assistant", icon: "🤖" },
  { to: "/notifications", label: "Notifications", icon: "🔔" },
];

const RESIDENT_LINKS = [
  { to: "/resident/dashboard", label: "My Dashboard", icon: "🏠" },
  { to: "/resident/complaints", label: "My Complaints", icon: "📋" },
  { to: "/resident/payments", label: "My Bills & Dues", icon: "💳" },
  { to: "/resident/notices", label: "Notice Board", icon: "📢" },
  { to: "/resident/visitors", label: "Visitor Log", icon: "🚶" },
  { to: "/resident/ai", label: "AI Assistant", icon: "🤖" },
  { to: "/notifications", label: "Notifications", icon: "🔔" },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const links = user?.role === "admin" ? ADMIN_LINKS : RESIDENT_LINKS;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
              S
            </div>
            <div>
              <p className="text-sm font-bold text-white tracking-wide leading-none">SocietyOS</p>
              <p className="text-[11px] text-slate-400 font-medium capitalize mt-1">
                {user?.role === "admin" ? "Admin Portal" : "Resident Portal"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white lg:hidden"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => onClose?.()}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white font-semibold shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`
              }
            >
              <span className="text-lg shrink-0">{link.icon}</span>
              <span className="truncate">{link.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User bar & logout */}
        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-800/40 mb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold flex items-center justify-center shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{user?.name}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
