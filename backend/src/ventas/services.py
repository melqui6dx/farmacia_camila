from decimal import Decimal

from django.utils import timezone
from django.db import transaction
from clientes.models import RecetaMedica
from inventarios.models import Inventario, MovimientoInventario, Producto

from .models import DetalleVenta, Venta


class VentaServiceError(Exception):
    def __init__(self, message, code="venta_error"):
        super().__init__(message)
        self.code = code


@transaction.atomic
def crear_venta_service(
    *,
    cliente,
    items,
    origen,
    vendedor=None,
    estado="pendiente",
    descuento=Decimal("0"),
    impuesto=Decimal("0"),
    observacion="",
):
    if origen not in {"fisica", "online"}:
        raise VentaServiceError("Origen de venta invalido.", code="origen_invalido")
    if not items:
        raise VentaServiceError("La venta debe incluir al menos un item.", code="items_requeridos")
    if origen == "fisica" and vendedor is None:
        raise VentaServiceError("La venta fisica requiere vendedor.", code="vendedor_requerido")
    if origen == "online":
        vendedor = None

    try:
        descuento = Decimal(descuento)
        impuesto = Decimal(impuesto)
    except Exception as exc:
        raise VentaServiceError("Descuento o impuesto invalido.", code="totales_invalidos") from exc
    if descuento < 0 or impuesto < 0:
        raise VentaServiceError("Descuento e impuesto no pueden ser negativos.", code="totales_invalidos")

    producto_ids = []
    cantidades_por_producto = {}
    receta_ids = set()

    for item in items:
        producto_id = item.get("producto_id")
        cantidad = item.get("cantidad")
        receta_id = item.get("receta_id")
        if not producto_id:
            raise VentaServiceError("Cada item debe incluir producto_id.", code="producto_requerido")
        if cantidad is None or int(cantidad) <= 0:
            raise VentaServiceError("La cantidad debe ser mayor a 0.", code="cantidad_invalida")
        cantidad = int(cantidad)
        producto_ids.append(producto_id)
        cantidades_por_producto[producto_id] = cantidades_por_producto.get(producto_id, 0) + cantidad
        if receta_id:
            receta_ids.add(receta_id)

    productos_qs = Producto.objects.filter(id__in=producto_ids, estado=True).select_related("inventario")
    productos_map = {producto.id: producto for producto in productos_qs}
    if len(productos_map) != len(set(producto_ids)):
        missing_ids = sorted(set(producto_ids) - set(productos_map.keys()))
        raise VentaServiceError(f"Productos no encontrados o inactivos: {missing_ids}", code="producto_no_disponible")

    recetas_map = {r.id: r for r in RecetaMedica.objects.filter(id__in=receta_ids)} if receta_ids else {}

    inventarios_qs = Inventario.objects.select_for_update().filter(producto_id__in=producto_ids)
    inventario_map = {inv.producto_id: inv for inv in inventarios_qs}
    if len(inventario_map) != len(set(producto_ids)):
        missing_inventory = sorted(set(producto_ids) - set(inventario_map.keys()))
        raise VentaServiceError(f"Inventario no configurado para productos: {missing_inventory}", code="inventario_faltante")

    for producto_id, cantidad_total in cantidades_por_producto.items():
        inventario = inventario_map[producto_id]
        if inventario.stock_disponible < cantidad_total:
            producto = productos_map[producto_id]
            raise VentaServiceError(
                f"Stock insuficiente para {producto.nombre_comercial} (disponible: {inventario.stock_disponible}, solicitado: {cantidad_total}).",
                code="stock_insuficiente",
            )

    subtotal_venta = Decimal("0")
    detalles = []
    hoy = timezone.localdate()

    for item in items:
        producto = productos_map[item["producto_id"]]
        cantidad = int(item["cantidad"])
        receta_id = item.get("receta_id")
        receta = recetas_map.get(receta_id) if receta_id else None

        if producto.requiere_receta:
            if not receta:
                raise VentaServiceError(
                    f"El producto {producto.nombre_comercial} requiere receta medica.",
                    code="receta_requerida",
                )
            if receta.cliente_id != cliente.id:
                raise VentaServiceError("La receta no corresponde al cliente.", code="receta_invalida")
            if receta.estado != "aprobada":
                raise VentaServiceError("La receta debe estar aprobada.", code="receta_invalida")
            if receta.fecha_vencimiento and receta.fecha_vencimiento < hoy:
                raise VentaServiceError("La receta esta vencida.", code="receta_vencida")

        precio_unitario = item.get("precio_unitario", producto.precio_venta)
        try:
            precio_unitario = Decimal(precio_unitario)
        except Exception as exc:
            raise VentaServiceError("Precio unitario invalido.", code="precio_invalido") from exc
        if precio_unitario < 0:
            raise VentaServiceError("Precio unitario no puede ser negativo.", code="precio_invalido")

        subtotal_item = precio_unitario * cantidad
        subtotal_venta += subtotal_item
        detalles.append(DetalleVenta(producto=producto, cantidad=cantidad, precio_unitario=precio_unitario, subtotal=subtotal_item))

    total_venta = subtotal_venta - descuento + impuesto
    if total_venta < 0:
        raise VentaServiceError("El total de la venta no puede ser negativo.", code="total_invalido")

    venta = Venta.objects.create(
        cliente=cliente,
        vendedor=vendedor,
        origen=origen,
        estado=estado,
        subtotal=subtotal_venta,
        descuento=descuento,
        impuesto=impuesto,
        total=total_venta,
        observacion=observacion,
    )

    for detalle in detalles:
        detalle.venta = venta
    DetalleVenta.objects.bulk_create(detalles)

    referencia = f"VENTA-{venta.id}"
    for detalle in detalles:
        MovimientoInventario.objects.create(
            producto=detalle.producto,
            tipo_movimiento="salida",
            cantidad=detalle.cantidad,
            motivo="venta",
            referencia=referencia,
            usuario=vendedor,
            observacion=f"Salida por venta #{venta.id}",
        )

    return venta
