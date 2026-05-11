import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { getCurrentTenantSubscription, getPublicPlans, startTenantCheckout } from "../../services/authService";
import { getErrorMessage } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";

export default function TenantSubscriptionPage() {
  const navigate = useNavigate();
  const { loading, user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true });
      return;
    }

    getCurrentTenantSubscription()
      .then(setSubscription)
      .catch((err) => setError(getErrorMessage(err, "No se pudo obtener la suscripcion.")));

    getPublicPlans().then(setPlans).catch(() => {});
  }, [loading, user, navigate]);

  const handleUpgrade = async (planSlug, cycle) => {
    setError("");
    try {
      const data = await startTenantCheckout({ plan_slug: planSlug, billing_cycle: cycle });
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo iniciar Stripe Checkout."));
    }
  };

  return (
    <main className="farm-bg min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-sm">
          <h1 className="text-2xl font-extrabold text-slate-900">Suscripcion del tenant</h1>
          <p className="mt-2 text-sm text-slate-600">Gestiona plan, renovaciones y cambios de nivel con Stripe.</p>
        </header>

        {error ? (
          <Alert tone="danger">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {subscription ? (
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Plan actual: {subscription.plan?.nombre}</h2>
            <p className="mt-1 text-sm text-slate-600">Estado: {subscription.estado}</p>
            <p className="mt-1 text-sm text-slate-600">Inicio: {subscription.fecha_inicio}</p>
            <p className="mt-1 text-sm text-slate-600">Fin: {subscription.fecha_fin || "N/A"}</p>
          </article>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => (
            <article key={plan.slug} className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">{plan.nombre}</h3>
              <p className="mt-2 text-sm text-slate-600">Usuarios: {plan.limite_usuarios}</p>
              <div className="mt-4 grid gap-2">
                <Button onClick={() => handleUpgrade(plan.slug, "monthly")}>Mensual</Button>
                <Button variant="secondary" onClick={() => handleUpgrade(plan.slug, "annual")}>Anual</Button>
              </div>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
