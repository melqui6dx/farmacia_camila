import { useState } from "react";
import { CloseIcon } from "../ui/Icons";

export default function SaleConfirmation({ cart, totals, processing, onConfirm, onCancel }) {
  const [clienteData, setClienteData] = useState({
    cliente_id: "",
    nombres: "",
    apellidos: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = clienteData.cliente_id
      ? { cliente_id: Number(clienteData.cliente_id) }
      : {
          nombres: clienteData.nombres.trim() || "Cliente",
          apellidos: clienteData.apellidos.trim() || "Mostrador",
        };
    onConfirm(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-black text-slate-900">Confirmar venta</h2>
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 transition hover:text-slate-600"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="max-h-60 overflow-y-auto px-6 py-4">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="pb-2 pr-2">Producto</th>
                  <th className="pb-2 pr-2">Cant.</th>
                  <th className="pb-2 pr-2">Precio</th>
                  <th className="pb-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item) => (
                  <tr key={item.producto_id} className="border-b border-slate-100">
                    <td className="py-2 pr-2 font-medium text-slate-800">{item.nombre}</td>
                    <td className="py-2 pr-2 text-slate-600">{item.cantidad}</td>
                    <td className="py-2 pr-2 text-slate-600">Bs {Number(item.precio_unitario).toFixed(2)}</td>
                    <td className="py-2 text-right font-bold text-emerald-700">
                      Bs {item.subtotal.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-100 px-6 py-3">
            <div className="flex items-center justify-between text-base font-black text-slate-900">
              <span>Total</span>
              <span>Bs {totals.total.toFixed(2)}</span>
            </div>
          </div>

          <div className="border-t border-slate-100 px-6 py-4">
            <p className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Datos del cliente</p>
            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Cliente existente (ID) <span className="text-slate-400">— opcional</span>
              </label>
              <input
                type="number"
                min="1"
                value={clienteData.cliente_id}
                onChange={(e) => setClienteData((prev) => ({ ...prev, cliente_id: e.target.value }))}
                placeholder="Dejar vacío para cliente de mostrador"
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              />
            </div>
            {!clienteData.cliente_id && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Nombres</label>
                  <input
                    type="text"
                    value={clienteData.nombres}
                    onChange={(e) => setClienteData((prev) => ({ ...prev, nombres: e.target.value }))}
                    placeholder="Cliente"
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Apellidos</label>
                  <input
                    type="text"
                    value={clienteData.apellidos}
                    onChange={(e) => setClienteData((prev) => ({ ...prev, apellidos: e.target.value }))}
                    placeholder="Mostrador"
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={processing}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={processing}
              className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:from-emerald-500 hover:to-teal-500 disabled:opacity-60"
            >
              {processing ? "Procesando..." : `Confirmar venta — Bs ${totals.total.toFixed(2)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
