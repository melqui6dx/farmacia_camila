import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";

function formatPrecio(valor) {
  const numero = Number(valor || 0);
  return new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
    minimumFractionDigits: 2,
  }).format(numero);
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const items = state?.items || [];
  const subtotalInicial = Number(state?.subtotal || 0);
  const impuestoInicial = Number(state?.impuesto || 0);
  const totalInicial = Number(state?.total || 0);

  const [metodoEntrega, setMetodoEntrega] = useState("domicilio");

  const subtotal = useMemo(() => {
    if (subtotalInicial > 0) return subtotalInicial;
    return items.reduce((acc, item) => acc + Number(item.precio_venta || 0) * Number(item.cantidad || 0), 0);
  }, [items, subtotalInicial]);

  const envio = metodoEntrega === "domicilio" ? 5 : 0;
  const impuesto = impuestoInicial > 0 ? impuestoInicial : subtotal * 0.0825;
  const total = totalInicial > 0 ? totalInicial + envio : subtotal + impuesto + envio;

  return (
    <main className="farm-bg min-h-screen px-4 py-8 text-slate-800 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-6xl space-y-5">
        <div className="rounded-[24px] border border-sky-100 bg-white p-4 shadow-2xl shadow-slate-200/60 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black text-slate-900">Confirmar compra</h1>
              <p className="text-sm font-semibold text-slate-500">Finaliza tu pedido con pago en linea con tarjeta de credito.</p>
            </div>
            <Button variant="outline" onClick={() => navigate("/")}>Volver</Button>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="text-xl font-black text-slate-900">Carrito de compra</h2>
                <div className="mt-3 space-y-2">
                  {items.length === 0 ? (
                    <p className="text-sm font-semibold text-slate-500">No hay productos en el carrito.</p>
                  ) : (
                    items.map((item) => (
                      <div key={item.id} className="flex items-start justify-between rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                        <div>
                          <p className="text-sm font-bold text-slate-800">{item.nombre_comercial}</p>
                          <p className="text-xs font-semibold text-slate-500">Cantidad: {item.cantidad}</p>
                        </div>
                        <p className="text-sm font-black text-slate-900">{formatPrecio(Number(item.precio_venta || 0) * Number(item.cantidad || 0))}</p>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="text-xl font-black text-slate-900">Metodo de entrega</h2>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setMetodoEntrega("domicilio")}
                    className={`rounded-lg border p-3 text-left ${metodoEntrega === "domicilio" ? "border-teal-400 bg-teal-50" : "border-slate-200 bg-white"}`}
                  >
                    <p className="text-sm font-bold text-slate-800">Entrega a domicilio</p>
                    <p className="text-xs font-semibold text-slate-500">24 a 48 horas</p>
                    <p className="text-sm font-black text-teal-700">+{formatPrecio(5)}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetodoEntrega("retiro")}
                    className={`rounded-lg border p-3 text-left ${metodoEntrega === "retiro" ? "border-teal-400 bg-teal-50" : "border-slate-200 bg-white"}`}
                  >
                    <p className="text-sm font-bold text-slate-800">Retiro en tienda</p>
                    <p className="text-xs font-semibold text-slate-500">Disponible en 2 horas</p>
                    <p className="text-sm font-black text-teal-700">Gratis</p>
                  </button>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="text-xl font-black text-slate-900">Datos de facturacion</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input className="h-10 rounded-lg border border-slate-300 px-3 text-sm" placeholder="Nombre y apellidos" />
                  <input className="h-10 rounded-lg border border-slate-300 px-3 text-sm" placeholder="CI/NIT" />
                  <input className="h-10 rounded-lg border border-slate-300 px-3 text-sm" placeholder="Email" />
                  <input className="h-10 rounded-lg border border-slate-300 px-3 text-sm" placeholder="Telefono" />
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="text-xl font-black text-slate-900">Datos de pago</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input className="h-10 rounded-lg border border-slate-300 px-3 text-sm sm:col-span-2" placeholder="Nombre del titular" />
                  <input className="h-10 rounded-lg border border-slate-300 px-3 text-sm sm:col-span-2" placeholder="Numero de tarjeta" />
                  <input className="h-10 rounded-lg border border-slate-300 px-3 text-sm" placeholder="MM/AA" />
                  <input className="h-10 rounded-lg border border-slate-300 px-3 text-sm" placeholder="CVV" />
                </div>
              </section>
            </div>

            <aside className="h-fit rounded-xl border border-slate-200 bg-white p-4 lg:sticky lg:top-6">
              <h2 className="text-xl font-black text-slate-900">Resumen del pedido</h2>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between font-medium text-slate-600"><span>Subtotal ({items.length} items)</span><span>{formatPrecio(subtotal)}</span></div>
                <div className="flex justify-between font-medium text-slate-600"><span>Envio</span><span>{formatPrecio(envio)}</span></div>
                <div className="flex justify-between font-medium text-slate-600"><span>Impuesto</span><span>{formatPrecio(impuesto)}</span></div>
                <div className="border-t border-slate-200 pt-2 text-lg font-black text-slate-900 flex justify-between"><span>Total</span><span>{formatPrecio(total)}</span></div>
              </div>
              <Button className="mt-4 h-11 w-full bg-teal-700 text-base font-black hover:bg-teal-600">Completar pago</Button>
              <p className="mt-2 text-center text-xs font-semibold text-slate-500">Pago seguro SSL con tarjeta de credito.</p>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
