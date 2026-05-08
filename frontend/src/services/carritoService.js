import { requestJson, requestJsonWithAuthRetry } from './apiClient';

const buildQuery = (params) => {
  if (!params) return '';
  return '?' + new URLSearchParams(params).toString();
};

const buildBodyAndHeaders = (data) => {
  if (data instanceof FormData) {
    return { body: data };
  }

  return {
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  };
};

export const carritoService = {
  agregar: (data) => requestJsonWithAuthRetry('/api/carrito/agregar/', {
    method: 'POST',
    ...buildBodyAndHeaders(data),
  }),
  listar: () => requestJsonWithAuthRetry('/api/carrito/'),
  actualizarItem: (itemId, data) => requestJsonWithAuthRetry(`/api/carrito/items/${itemId}/`, {
    method: 'PATCH',
    ...buildBodyAndHeaders(data),
  }),
  eliminarItem: (itemId) => requestJsonWithAuthRetry(`/api/carrito/items/${itemId}/`, {
    method: 'DELETE',
  }),
  confirmar: (data) => requestJsonWithAuthRetry('/api/carrito/confirmar/', {
    method: 'POST',
    ...buildBodyAndHeaders(data),
  }),
};
