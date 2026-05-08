import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MainHeader from "../components/layout/MainHeader";
import SiteFooter from "../components/layout/SiteFooter";
import TopStrip from "../components/layout/TopStrip";
import HeroBanner from "../components/sections/HeroBanner";
import LandingPromos from "../components/sections/LandingPromos";
import QuickActions from "../components/sections/QuickActions";
import CatalogoFarmaceutico from "../components/sections/CatalogoFarmaceutico";
import { useAuth } from "../context/AuthContext";

export default function HomePage() {
  const navigate = useNavigate();
  const { user, loading, logout, isAdmin } = useAuth();

  const isAuthenticated = useMemo(() => Boolean(user), [user]);

  useEffect(() => {
    if (!loading && isAdmin) {
      navigate("/admin", { replace: true });
    }
  }, [loading, isAdmin, navigate]);

  const handleLogout = async () => {
    await logout();
  };

  const handleCartClick = () => {
    navigate("/checkout");
  };

  return (
    <main className="farm-bg min-h-screen px-4 py-8 text-slate-800 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-6xl space-y-5">
        <TopStrip />
        <MainHeader
          isAuthenticated={isAuthenticated}
          user={user}
          onLoginClick={() => navigate("/login")}
          onRegisterClick={() => navigate("/register")}
          onProfileClick={() => navigate("/perfil")}
          onLogoutClick={handleLogout}
          onCartClick={handleCartClick}
        />
        <HeroBanner />
        <LandingPromos />
        <QuickActions />
        <CatalogoFarmaceutico />

        <SiteFooter />
      </section>
    </main>
  );
}
