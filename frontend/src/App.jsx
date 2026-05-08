import { lazy, Suspense } from "react";
import HomePage from "./pages/HomePage";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/routing/ProtectedRoute";
import AdminRoute from "./components/routing/AdminRoute";
import POSRoute from "./components/routing/POSRoute";
import PageLoader from "./components/routing/PageLoader";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

// Lazy-loaded pages
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage"));
const AdminUsersPage = lazy(() => import("./pages/admin/AdminUsersPage"));
const AdminRolesPermisosPage = lazy(() => import("./pages/admin/AdminRolesPermisosPage"));
const AdminInventariosPage = lazy(() => import("./pages/admin/AdminInventariosPage"));
const AdminProductosPage = lazy(() => import("./pages/admin/AdminProductosPage"));
const AdminLaboratariosPage = lazy(() => import("./pages/admin/AdminLaboratoriosPage"));
const AdminCategoriasPage = lazy(() => import("./pages/admin/AdminCategoriasPage"));
const AdminClientesPage = lazy(() => import("./pages/admin/AdminClientesPage"));
const AdminBitacoraPage = lazy(() => import("./pages/admin/AdminBitacoraPage"));
const ClientePerfilPage = lazy(() => import("./pages/ClientePerfilPage"));
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("./pages/auth/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage"));
const VerifyEmailPage = lazy(() => import("./pages/auth/VerifyEmailPage"));

const POSPage = lazy(() => import("./pages/pos/POSPage"));

const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/perfil" element={<ClientePerfilPage />} />
        </Route>

        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<Navigate to="/admin/resumen" replace />} />
          <Route path="/admin/resumen" element={<AdminDashboardPage />} />
          <Route path="/admin/usuarios" element={<AdminUsersPage />} />
          <Route path="/admin/roles-permisos" element={<AdminRolesPermisosPage />} />
          <Route path="/admin/inventarios" element={<AdminInventariosPage />} />
          <Route path="/admin/productos" element={<AdminProductosPage />} />
          <Route path="/admin/categorias" element={<AdminCategoriasPage />} />
          <Route path="/admin/laboratorios" element={<AdminLaboratariosPage />} />
          <Route path="/admin/clientes" element={<AdminClientesPage />} />
          <Route path="/admin/bitacora" element={<AdminBitacoraPage />} />
        </Route>

        <Route element={<POSRoute />}>
          <Route path="/pos" element={<POSPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
