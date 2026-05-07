# Carrito de Compras - Descripcion y Uso

## 1. Objetivo
Este documento describe el backend implementado para el carrito de compras (web y movil), incluyendo:
- Estructura
- Reglas de seguridad
- Endpoints
- Payloads
- Flujo de confirmacion a venta

El carrito esta pensado como estado temporal previo a la venta online.

---

## 2. Arquitectura implementada

### App involucrada
- `carrito`

### Integraciones
- `clientes` (cliente registrado/invitado)
- `inventarios` (productos y stock)
- `ventas` (confirmacion de carrito a venta)

### Principio
El carrito **no realiza la venta**. Solo prepara items.
La venta real ocurre al confirmar carrito, llamando al servicio compartido:
- `crear_venta_service(...)`

---

## 3. Modelos

## 3.1 `Carrito`
Campos principales:
- `cliente`
- `usuario` (opcional)
- `estado`: `activo`, `confirmado`, `cancelado`
- `origen`: por defecto `online`
- `invitado_token`: seguridad para sesiones de invitados
- `created_at`, `updated_at`

Uso:
- Un cliente opera sobre su carrito `activo`.
- Al confirmar, el carrito pasa a `confirmado`.

## 3.2 `CarritoItem`
Campos principales:
- `carrito`
- `producto`
- `cantidad`
- `precio_unitario`
- `subtotal`

Restriccion:
- `unique_together (carrito, producto)`

Nota:
- El carrito **no guarda receta medica**.
- La receta se envia y valida recien al confirmar venta.

---

## 4. Reglas de acceso y seguridad

## 4.1 Cliente autenticado
- Usuario normal: solo puede operar su propio `cliente`.
- `staff/superuser`: puede operar cualquier cliente.

## 4.2 Cliente invitado
- Puede operar sin login, solo si el cliente es tipo `invitado`.
- Si ya existe carrito activo, debe enviar `carrito_token`.

## 4.3 `carrito_token`
Se puede enviar por:
- Header: `X-Carrito-Token`
- Body: `carrito_token`
- Query: `carrito_token`

Si el token no existe o es incorrecto para invitado, la operacion se bloquea (`403`).

---

## 5. Reglas de negocio

1. Solo se modifica carrito en estado `activo`.
2. Cantidad debe ser mayor a 0.
3. Producto debe existir y estar activo.
4. Debe existir inventario para el producto.
5. En agregar, si el item ya existe, incrementa cantidad.
6. `subtotal` de item = `precio_unitario * cantidad`.
7. Totales de carrito se calculan dinamicamente sobre items.

---

## 6. Endpoints

## 6.1 Agregar item
### `POST /api/carrito/agregar/`
Agrega producto al carrito activo del cliente.

## 6.2 Actualizar item
### `PATCH /api/carrito/items/{id}/`
Actualiza cantidad del item.

## 6.3 Eliminar item
### `DELETE /api/carrito/items/{id}/?cliente_id=...`
Elimina un item del carrito.

## 6.4 Listar carrito
### `GET /api/carrito/?cliente_id=...`
Devuelve carrito activo + items + totales.
Si no existe, lo crea.

## 6.5 Confirmar carrito
### `POST /api/carrito/confirmar/`
Convierte carrito a venta online.
Valida stock y reglas de receta via `crear_venta_service`.

---

## 7. Payloads de ejemplo

## 7.1 Agregar item
```json
{
  "cliente_id": 10,
  "producto_id": 25,
  "cantidad": 2
}
```

## 7.2 Actualizar item
```json
{
  "cliente_id": 10,
  "cantidad": 3
}
```

## 7.3 Confirmar carrito sin receta
```json
{
  "cliente_id": 10,
  "estado": "pendiente",
  "descuento": "0.00",
  "impuesto": "0.00",
  "observacion": "Entrega en sucursal"
}
```

## 7.4 Confirmar carrito con receta (solo para productos que la requieren)
```json
{
  "cliente_id": 10,
  "recetas": [
    { "producto_id": 25, "receta_id": 7 }
  ]
}
```

## 7.5 Header de invitado
```txt
X-Carrito-Token: <token>
```

---

## 8. Flujo funcional recomendado (web/movil)

1. Crear/obtener carrito activo (`GET carrito` o `POST agregar`).
2. Agregar/editar/eliminar items.
3. Si el cliente es invitado, persistir `invitado_token`.
4. En checkout, recopilar recetas solo si hay productos que la requieren.
5. Confirmar carrito (`POST confirmar`).
6. Recibir `venta` creada y marcar orden como completada.

---

## 9. Errores comunes esperados

- `400`: datos invalidos, carrito vacio, cantidad invalida, producto no disponible.
- `403`: cliente sin permisos o token invitado invalido.
- `404`: carrito activo no encontrado para operaciones de item/confirmar.

---

## 10. Resumen
El carrito backend ya permite manejar el flujo completo para web/movil con soporte a:
- clientes registrados
- clientes invitados con token de sesion
- conversion segura a venta
- validaciones de stock y receta en el momento correcto (confirmacion de venta)
