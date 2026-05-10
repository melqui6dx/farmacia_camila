import React, { useState, useEffect } from 'react';
import { usePrediccionDemanda, useRecomendaciones, useTendencias, usePatronesEstacionales } from '../../hooks/usePredicciones';
import DemandaChart from '../../components/admin/predicciones/DemandaChart';
import RecomendacionesTable from '../../components/admin/predicciones/RecomendacionesTable';
import TendenciasTable from '../../components/admin/predicciones/TendenciasTable';
import PatronesEstacionalesTable from '../../components/admin/predicciones/PatronesEstacionalesTable';

export default function AdminPrediccionesPage() {
  const [productoId, setProductoId] = useState('');
  const [dias, setDias] = useState(7);
  const { prediccion, loading: loadingPred, error: errorPred, fetchPrediccion } = usePrediccionDemanda();
  const { recomendaciones, loading: loadingRec, loadRecomendaciones } = useRecomendaciones();
  const { tendencias, loading: loadingTen, loadTendencias } = useTendencias();
  const { patrones, loading: loadingPat, loadPatrones } = usePatronesEstacionales();

  useEffect(() => {
    loadRecomendaciones();
    loadTendencias();
    loadPatrones();
  }, []);

  const handlePredecir = (e) => {
    e.preventDefault();
    if (productoId) {
      fetchPrediccion(parseInt(productoId), dias);
    }
  };

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">Predicción de demanda</h1>

      {/* Formulario de predicción */}
      <div className="bg-white p-4 rounded shadow">
        <form onSubmit={handlePredecir} className="flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium">Producto ID</label>
            <input type="number" value={productoId} onChange={(e) => setProductoId(e.target.value)} className="border rounded px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium">Días a predecir</label>
            <input type="number" value={dias} onChange={(e) => setDias(parseInt(e.target.value))} className="border rounded px-3 py-2" min="1" max="30" />
          </div>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Predecir</button>
        </form>
      </div>

      {/* Resultado de predicción */}
      {loadingPred && <div>Cargando predicción...</div>}
      {errorPred && <div className="text-red-500">Error: {errorPred}</div>}
      {prediccion && <DemandaChart data={prediccion.predicciones} tendencia={prediccion.tendencia} />}

      {/* Recomendaciones de compra */}
      <div>
        <h2 className="text-xl font-semibold mt-8">Recomendaciones de compra</h2>
        {loadingRec && <div>Cargando...</div>}
        {recomendaciones.length === 0 && !loadingRec && <div className="text-gray-500">No hay productos que necesiten reabastecimiento por ahora.</div>}
        {recomendaciones.length > 0 && <RecomendacionesTable data={recomendaciones} />}
      </div>

      {/* Tendencias de consumo */}
      <div>
        <h2 className="text-xl font-semibold mt-8">Tendencias de consumo</h2>
        {loadingTen && <div>Cargando...</div>}
        {tendencias.length === 0 && !loadingTen && <div className="text-gray-500">No hay tendencias significativas.</div>}
        {tendencias.length > 0 && <TendenciasTable data={tendencias} />}
      </div>

      {/* Patrones estacionales */}
      <div>
        <h2 className="text-xl font-semibold mt-8">Patrones estacionales por categoría</h2>
        {loadingPat && <div>Cargando...</div>}
        {patrones.length === 0 && !loadingPat && <div className="text-gray-500">No hay datos suficientes.</div>}
        {patrones.length > 0 && <PatronesEstacionalesTable data={patrones} />}
      </div>
    </div>
  );
}