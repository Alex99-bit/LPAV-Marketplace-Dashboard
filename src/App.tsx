import { Routes, Route } from "react-router";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import Layout from "@/components/layout/Layout";
import AuthGuard from "@/components/auth/AuthGuard";
import LoginModal from "@/components/auth/LoginModal";
import Home from "@/pages/Home";
import PackageDetailPage from "@/pages/PackageDetailPage";
import AgencyRegister from "@/pages/AgencyRegister";
import AgencyDashboard from "@/pages/AgencyDashboard";
import AgencyFlyers from "@/pages/AgencyFlyers";
import AgencyRoles from "@/pages/AgencyRoles";
import AgencyCRM from "@/pages/AgencyCRM";
import Checkout from "@/pages/Checkout";
import Orders from "@/pages/Orders";
import Chat from "@/pages/Chat";
import NotFound from "@/pages/NotFound";

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/package/:id" element={<PackageDetailPage />} />
            <Route path="/auth/login" element={<LoginModal />} />
            <Route path="/agency/register" element={<AgencyRegister />} />
            <Route
              path="/agency/dashboard"
              element={
                <AuthGuard requireAgency>
                  <AgencyDashboard />
                </AuthGuard>
              }
            />
            <Route
              path="/agency/flyers"
              element={
                <AuthGuard requireAgency>
                  <AgencyFlyers />
                </AuthGuard>
              }
            />
            <Route
              path="/agency/roles"
              element={
                <AuthGuard requireAgency>
                  <AgencyRoles />
                </AuthGuard>
              }
            />
            <Route
              path="/agency/crm"
              element={
                <AuthGuard requireAgency>
                  <AgencyCRM />
                </AuthGuard>
              }
            />
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
        </Routes>
      </CartProvider>
    </AuthProvider>
  );
}
