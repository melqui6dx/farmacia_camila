import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function DemandaChart({ data, tendencia }) {
  const formattedData = data.map(item => ({
    fecha: new Date(item.fecha).toLocaleDateString(),
    unidades: item.unidades,
  }));

  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Predicción de unidades vendidas</h3>
        <span className={`px-2 py-1 rounded text-sm ${
          tendencia === 'creciente' ? 'bg-green-100 text-green-800' :
          tendencia === 'decreciente' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
        }`}>
          Tendencia: {tendencia}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="fecha" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="unidades" fill="#2563eb" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}