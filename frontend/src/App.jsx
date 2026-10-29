import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import DashboardLayout from "./components/layout/DashboardLayout";
import { PageLoader } from "./components/ui/LoadingSpinner";

// Public pages
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));

// Admin pages
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminResidents = lazy(() => import("./pages/admin/Residents"));
const AdminHouses = lazy(() => import("./pages/admin/Houses"));
const AdminComplaints = lazy(() => import("./pages/admin/Complaints"));
const AdminPayments = lazy(() => import("./pages/admin/Payments"));
const AdminNotices = lazy(() => import("./pages/admin/Notices"));
const AdminVisitors = lazy(() => import("./pages/admin/Visitors"));
const AdminReports = lazy(() => import("./pages/admin/Reports"));
const AdminAIAssistant = lazy(() => import("./pages/admin/AIAssistant"));

// Resident pages
const ResidentDashboard = lazy(() => import("./pages/resident/Dashboard"));
const ResidentComplaints = lazy(() => import("./pages/resident/MyComplaints"));
const ResidentPayments = lazy(() => import("./pages/resident/MyPayments"));
const ResidentNoticeBoard = lazy(() => import("./pages/resident/NoticeBoard"));
const ResidentVisitors = lazy(() => import("./pages/resident/MyVisitors"));
const ResidentAIAssistant = lazy(() => import("./pages/resident/AIAssistant"));

// Shared pages
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));

function ProtectedRoute({ children, allowedRole }) {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;

  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to={user.role === "admin" ? "/admin/dashboard" : "/resident/dashboard"} replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;
  if (user) {
    return <Navigate to={user.role === "admin" ? "/admin/dashboard" : "/resident/dashboard"} replace />;
  }

  return children;
}

function LayoutWrapper({ children }) {
  return (
    <DashboardLayout>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </DashboardLayout>
  );
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "admin" ? "/admin/dashboard" : "/resident/dashboard"} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRole="admin">
                  <LayoutWrapper>
                    <AdminDashboard />
                  </LayoutWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/residents"
              element={
                <ProtectedRoute allowedRole="admin">
                  <LayoutWrapper>
                    <AdminResidents />
                  </LayoutWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/houses"
              element={
                <ProtectedRoute allowedRole="admin">
                  <LayoutWrapper>
                    <AdminHouses />
                  </LayoutWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/complaints"
              element={
                <ProtectedRoute allowedRole="admin">
                  <LayoutWrapper>
                    <AdminComplaints />
                  </LayoutWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/payments"
              element={
                <ProtectedRoute allowedRole="admin">
                  <LayoutWrapper>
                    <AdminPayments />
                  </LayoutWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/notices"
              element={
                <ProtectedRoute allowedRole="admin">
                  <LayoutWrapper>
                    <AdminNotices />
                  </LayoutWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/visitors"
              element={
                <ProtectedRoute allowedRole="admin">
                  <LayoutWrapper>
                    <AdminVisitors />
                  </LayoutWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <ProtectedRoute allowedRole="admin">
                  <LayoutWrapper>
                    <AdminReports />
                  </LayoutWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/ai"
              element={
                <ProtectedRoute allowedRole="admin">
                  <LayoutWrapper>
                    <AdminAIAssistant />
                  </LayoutWrapper>
                </ProtectedRoute>
              }
            />

            {/* Resident Routes */}
            <Route
              path="/resident/dashboard"
              element={
                <ProtectedRoute allowedRole="resident">
                  <LayoutWrapper>
                    <ResidentDashboard />
                  </LayoutWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/resident/complaints"
              element={
                <ProtectedRoute allowedRole="resident">
                  <LayoutWrapper>
                    <ResidentComplaints />
                  </LayoutWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/resident/payments"
              element={
                <ProtectedRoute allowedRole="resident">
                  <LayoutWrapper>
                    <ResidentPayments />
                  </LayoutWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/resident/notices"
              element={
                <ProtectedRoute allowedRole="resident">
                  <LayoutWrapper>
                    <ResidentNoticeBoard />
                  </LayoutWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/resident/visitors"
              element={
                <ProtectedRoute allowedRole="resident">
                  <LayoutWrapper>
                    <ResidentVisitors />
                  </LayoutWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/resident/ai"
              element={
                <ProtectedRoute allowedRole="resident">
                  <LayoutWrapper>
                    <ResidentAIAssistant />
                  </LayoutWrapper>
                </ProtectedRoute>
              }
            />

            {/* Shared Authenticated Routes */}
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <LayoutWrapper>
                    <NotificationsPage />
                  </LayoutWrapper>
                </ProtectedRoute>
              }
            />

            {/* Default Root Redirect */}
            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
