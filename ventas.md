# Ventas - Descripcion y Uso

## 1. Objetivo
Este documento resume todo lo implementado en backend para:
- Nucleo compartido de ventas
- Ventas fisicas y online
- Carrito para web y movil
- Validacion de recetas medicas al momento de cerrar la venta

La idea central es: **toda venta pasa por un unico servicio transaccional**.

---

## 2. Arquitectura implementada

### Apps involucradas
- `clientes`
- `ventas`
- `carrito`
- `inventarios`

### Principio de negocio
Todos los canales (fisica, web, movil) convergen en:
- `crear_venta_service(...)`

Ese servicio realiza:
1. Validacion de cliente y productos
2. Validacion de stock
3. Validacion de receta medica (si aplica)
4. Calculo de totales
5. Creacion de `Venta` y `DetalleVenta`
6. Registro de `MovimientoInventario` de salida

---

## 3. Modelos creados

## 3.1 Clientes
### `Cliente`
- Soporta cliente registrado e invitado.

### `RecetaMedica`
- Campos clave:
  - `cliente`
  - `codigo` (unico)
  - `estado` (`pendiente`, `aprobada`, `rechazada`, `vencida`)
  - `fecha_vencimiento`
  - `validada_por`, `validada_en`

Uso: se valida en checkout/venta, no en carrito.

## 3.2 Ventas
### `Venta`
- `origen`: `fisica` u `online`
- `vendedor`: obligatorio para fisica, `None` en online
- `estado`, `subtotal`, `descuento`, `impuesto`, `total`

### `DetalleVenta`
- `venta`, `producto`, `cantidad`, `precio_unitario`, `subtotal`

## 3.3 Carrito
### `Carrito`
- `estado`: `activo`, `confirmado`, `cancelado`
- `invitado_token`: token para proteger carritos de invitados

### `CarritoItem`
- `carrito`, `producto`, `cantidad`, `precio_unitario`, `subtotal`
- **No guarda receta** (por decision funcional)

---

## 4. Reglas de negocio principales

## 4.1 Stock
- Se bloquea inventario con `select_for_update` en el servicio de ventas.
- Si no hay stock disponible, la venta falla.

## 4.2 Receta medica
Si un producto tiene `requiere_receta=True`, al cerrar venta se exige:
1. `receta_id` enviado en la confirmacion
2. Receta perteneciente al mismo cliente
3. Receta con estado `aprobada`
4. Receta no vencida

Si falla alguna condicion, la venta es rechazada.

## 4.3 Seguridad por canal en carrito
- Usuario autenticado normal: solo su `cliente`.
- `staff/superuser`: puede operar cualquier cliente.
- Invitado anonimo: solo clientes tipo `invitado`.
- Si el invitado ya tiene carrito activo, debe enviar `carrito_token`.

---

## 5. Endpoints implementados

## 5.1 Ventas
### `POST /api/ventas/crear-fisica/`
- Requiere autenticacion.
- Usa `crear_venta_service(origen="fisica", vendedor=request.user)`.

### `POST /api/ventas/crear-online/`
- Flujo online.
- Usa `crear_venta_service(origen="online", vendedor=None)`.

## 5.2 Carrito
### `POST /api/carrito/agregar/`
Agrega producto al carrito activo.

### `PATCH /api/carrito/items/{id}/`
Actualiza cantidad de item.

### `DELETE /api/carrito/items/{id}/?cliente_id=...`
Elimina item.

### `GET /api/carrito/?cliente_id=...`
Lista carrito activo (lo crea si no existe).

### `POST /api/carrito/confirmar/`
Convierte carrito a venta online.

---

## 6. Payloads de ejemplo

## 6.1 Agregar al carrito
```json
{
  "cliente_id": 10,
  "producto_id": 25,
  "cantidad": 2
}
```

## 6.2 Confirmar carrito (sin receta)
```json
{
  "cliente_id": 10,
  "estado": "pendiente",
  "descuento": "0.00",
  "impuesto": "0.00",
  "observacion": "Entrega en sucursal"
}
```

## 6.3 Confirmar carrito (con receta para productos controlados)
```json
{
  "cliente_id": 10,
  "recetas": [
    { "producto_id": 25, "receta_id": 7 },
    { "producto_id": 31, "receta_id": 8 }
  ]
}
```

## 6.4 Token de invitado
Se puede enviar por:
- Header: `X-Carrito-Token: <token>`
- Body/query: `carrito_token`

---

## 7. Flujo recomendado por canal

## 7.1 Web/movil
1. Crear/obtener carrito
2. Agregar/editar items
3. Si hay productos con receta, pedir recetas en checkout
4. Enviar `recetas[]` en `carrito/confirmar`
5. Recibir venta creada

## 7.2 Venta fisica
1. Capturar items en POS
2. Si hay productos con receta, capturar `receta_id` en la venta
3. Llamar endpoint de venta fisica
4. `crear_venta_service` valida todo y registra inventario

---

## 8. Estado de pruebas
- Tests de carrito y confirmacion ejecutados en backend.
- Validaciones de receta en checkout cubiertas.
- `manage.py check` sin issues.

---

## 9. Resumen
El backend queda preparado para operar ventas de forma unificada en todos los canales, con control de stock, soporte de invitados y validacion de receta medica en el momento correcto: **al cerrar la venta**.
