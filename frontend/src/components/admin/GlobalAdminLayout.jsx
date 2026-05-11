import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDownIcon, LogOutIcon, ShieldIcon, UserIcon } from "../ui/Icons";
import { useOutsideClick } from "../../hooks/useOutsideClick";

export default function GlobalAdminLayout({ currentUser, onLogout, title, subtitle, actions, children }) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);
  const navigate = useNavigate();

  useOutsideClick(userMenuRef, () => setShowUserMenu(false));

  const fullName = useMemo(() => {
    return [currentUser?.first_name, currentUser?.last_name].filter(Boolean).join(" ").trim();
  }, [currentUser]);

  const displayName = useMemo(() => {
    return fullName || currentUser?.username || "Superadmin";
  }, [fullName, currentUser]);

  const initials = useMemo(() => {
    if (fullName) {
      const parts = fullName.split(" ").filter(Boolean);
      const first = parts[0]?.[0] || "";
      const second = parts[1]?.[0] || "";
      return `${first}${second}`.toUpperCase() || "SA";
    }

    const value = currentUser?.username || "superadmin";
    return value.slice(0, 2).toUpperCase();
  }, [currentUser, fullName]);

  return (
    <main className="farm-bg min-h-screen text-slate-800">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-700">Backoffice global SaaS</p>
            <h1 className="truncate text-xl font-black text-slate-900">{title || "Panel Global"}</h1>
            {subtitle ? <p className="truncate text-xs text-slate-500">{subtitle}</p> : null}
          </div>

          <div className="flex items-center gap-2">
            {actions}
            <button
              type="button"
              onClick={() => navigate("/saas/login")}
              className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:inline-flex"
            >
              Cambiar cuenta
            </button>

            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setShowUserMenu((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 shadow-sm transition hover:border-slate-300"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-cyan-600 text-xs font-black text-white">
                  {initials}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-xs font-bold text-slate-800">{displayName}</span>
                  <span className="block text-[11px] text-slate-500">Superadmin</span>
                </span>
                <ChevronDownIcon className={`h-4 w-4 text-slate-500 transition ${showUserMenu ? "rotate-180" : ""}`} />
              </button>

              {showUserMenu ? (
                <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                  <div className="border-b border-slate-100 bg-slate-50 px-3 py-2">
                    <p className="text-xs font-bold text-slate-800">{displayName}</p>
                    <p className="text-[11px] text-slate-500">{currentUser?.email || "Sin correo"}</p>
                  </div>
                  <div className="p-1.5">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      <UserIcon className="h-4 w-4" />
                      Perfil global
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      <ShieldIcon className="h-4 w-4" />
                      Rol: Superadmin
                    </button>
                    <button
                      type="button"
                      onClick={onLogout}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                    >
                      <LogOutIcon className="h-4 w-4" />
                      Cerrar sesion
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</section>
    </main>
  );
}
