from decimal import Decimal

from django.db import transaction
from django.db.models import F

from inventarios.models import Inventario, Producto

from .models import Carrito, CarritoItem


class CarritoServiceError(Exception):
    pass


def obtener_o_crear_carrito_activo(*, usuario):
    carrito = Carrito.objects.filter(usuario=usuario, estado="activo").order_by("-updated_at").first()
    if carrito:
        return carrito

    carrito = Carrito(usuario=usuario, estado="activo", origen="online")
    if not usuario:
        carrito.ensure_guest_token()
    carrito.save()
    return carrito


@transaction.atomic
def agregar_item_carrito(*, carrito, producto_id, cantidad):
    if carrito.estado != "activo":
        raise CarritoServiceError("Solo se puede modificar un carrito activo.")
    if cantidad <= 0:
        raise CarritoServiceError("La cantidad debe ser mayor a 0.")

    producto = Producto.objects.filter(id=producto_id, estado=True).first()
    if not producto:
        raise CarritoServiceError("Producto no encontrado o inactivo.")
    inventario = Inventario.objects.filter(producto=producto).first()
    if not inventario:
        raise CarritoServiceError("Inventario no configurado para el producto.")

    item, created = CarritoItem.objects.select_for_update().get_or_create(
        carrito=carrito,
        producto=producto,
        defaults={"cantidad": cantidad, "precio_unitario": producto.precio_venta, "subtotal": Decimal(producto.precio_venta) * cantidad},
    )

    if not created:
        item.cantidad = F("cantidad") + cantidad
        item.save(update_fields=["cantidad", "updated_at"])
        item.refresh_from_db(fields=["cantidad"])
        item.precio_unitario = producto.precio_venta
        item.subtotal = Decimal(item.precio_unitario) * item.cantidad
        item.save(update_fields=["precio_unitario", "subtotal", "updated_at"])
    return item


@transaction.atomic
def actualizar_item_carrito(*, carrito, item_id, cantidad):
    if carrito.estado != "activo":
        raise CarritoServiceError("Solo se puede modificar un carrito activo.")
    if cantidad <= 0:
        raise CarritoServiceError("La cantidad debe ser mayor a 0.")

    item = CarritoItem.objects.select_for_update().filter(id=item_id, carrito=carrito).first()
    if not item:
        raise CarritoServiceError("Item no encontrado en el carrito.")

    item.cantidad = cantidad
    item.subtotal = Decimal(item.precio_unitario) * cantidad
    item.save(update_fields=["cantidad", "subtotal", "updated_at"])
    return item


@transaction.atomic
def eliminar_item_carrito(*, carrito, item_id):
    if carrito.estado != "activo":
        raise CarritoServiceError("Solo se puede modificar un carrito activo.")
    item = CarritoItem.objects.filter(id=item_id, carrito=carrito).first()
    if not item:
        raise CarritoServiceError("Item no encontrado en el carrito.")
    item.delete()


def calcular_totales_carrito(carrito):
    subtotal = Decimal("0")
    items = carrito.items.select_related("producto").all()
    for item in items:
        subtotal += item.subtotal
    return {"subtotal": subtotal, "total": subtotal, "cantidad_items": items.count()}
