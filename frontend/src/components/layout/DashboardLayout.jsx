import React, { useState, useEffect, createContext, useContext } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import ToastContainer from "../ui/Toast";
import { useToast } from "../../hooks/useToast";
import api from "../../api/axios";

const ToastContext = createContext(null);
export const useToastContext = () => useContext(ToastContext);

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const toast = useToast();

  useEffect(() => {
    let active = true;
    const loadUnread = () => {
      api
        .get("/notifications/unread-count")
        .then((res) => {
          if (active) setNotifCount(res.data.data.count || 0);
        })
        .catch(() => {});
    };
    loadUnread();
    const timer = setInterval(loadUnread, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Navbar onToggleSidebar={() => setSidebarOpen(true)} notifCount={notifCount} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">{children}</div>
          </main>
        </div>
        <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
      </div>
    </ToastContext.Provider>
  );
}
