import { requestJson, requestJsonWithAuthRetry } from "./apiClient";

const buildQuery = (params) => {
  if (!params) return "";
  return `?${new URLSearchParams(params).toString()}`;
};

export const clientesService = {
  listar: (params) => requestJson(`/api/clientes/${buildQuery(params)}`),
  obtener: (id) => requestJson(`/api/clientes/${id}/`),
  crear: (data) =>
    requestJsonWithAuthRetry("/api/clientes/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  actualizar: (id, data) =>
    requestJsonWithAuthRetry(`/api/clientes/${id}/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  eliminar: (id) =>
    requestJsonWithAuthRetry(`/api/clientes/${id}/`, {
      method: "DELETE",
    }),
};
