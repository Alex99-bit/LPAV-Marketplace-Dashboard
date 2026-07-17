import { Routes, Route } from "react-router";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { ToastProvider } from "@/components/ui/Toast";
import Layout from "@/components/layout/Layout";
import AgencyLayout from "@/components/agency/AgencyLayout";
import AuthGuard from "@/components/auth/AuthGuard";
import LoginPage from "@/pages/auth/LoginPage";
import AgencyAuth from "@/pages/auth/AgencyAuth";
import AcceptInvitation from "@/pages/auth/AcceptInvitation";
import Home from "@/pages/Home";
import PackageDetailPage from "@/pages/PackageDetailPage";
import AgencyDashboard from "@/pages/AgencyDashboard";
import AgencyFlyers from "@/pages/AgencyFlyers";
import AgencyRoles from "@/pages/AgencyRoles";
import AgencyCRM from "@/pages/AgencyCRM";
import AgencyFinance from "@/pages/AgencyFinance";
import AgencyLogistics from "@/pages/AgencyLogistics";
import AgencySettings from "@/pages/AgencySettings";
import AgencyAnalytics from "@/pages/AgencyAnalytics";
import SuperAdminDashboard from "@/pages/SuperAdminDashboard";
import Checkout from "@/pages/Checkout";
import Orders from "@/pages/Orders";
import Chat from "@/pages/Chat";
import NotFound from "@/pages/NotFound";

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <ToastProvider>
          <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/package/:id" element={<PackageDetailPage />} />
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/agency" element={<AgencyAuth />} />
            <Route path="/auth/accept-invite" element={<AcceptInvitation />} />
            <Route
              path="/checkout"
              element={
                <AuthGuard>
                  <Checkout />
                </AuthGuard>
              }
            />
            <Route
              path="/orders"
              element={
                <AuthGuard>
                  <Orders />
                </AuthGuard>
              }
            />
            <Route
              path="/chat"
              element={
                <AuthGuard>
                  <Chat />
                </AuthGuard>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Route>

          <Route
            element={
              <AuthGuard requireAgency>
                <AgencyLayout />
              </AuthGuard>
            }
          >
            <Route path="/agency/dashboard" element={<AgencyDashboard />} />
            <Route path="/agency/flyers" element={<AgencyFlyers />} />
            <Route path="/agency/roles" element={<AgencyRoles />} />
            <Route path="/agency/crm" element={<AgencyCRM />} />
            <Route path="/agency/finance" element={<AgencyFinance />} />
            <Route path="/agency/logistics" element={<AgencyLogistics />} />
            <Route path="/agency/settings" element={<AgencySettings />} />
            <Route path="/agency/analytics" element={<AgencyAnalytics />} />
          </Route>

          <Route
            path="/admin"
            element={
              <AuthGuard requireAgency>
                <SuperAdminDashboard />
              </AuthGuard>
            }
          />
          </Routes>
        </ToastProvider>
      </CartProvider>
    </AuthProvider>
  );
}
