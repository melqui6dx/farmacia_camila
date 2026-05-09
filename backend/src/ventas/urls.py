from django.urls import path

from .views import (
    crear_venta_fisica,
    crear_venta_online,
    crear_venta_pos,
    crear_intent_pago,
    confirmar_pago_venta,
    obtener_factura,
)

urlpatterns = [
    # URLs existentes
    path("crear-fisica/", crear_venta_fisica, name="ventas-crear-fisica"),
    path("crear-online/", crear_venta_online, name="ventas-crear-online"),
    path("pos/crear/", crear_venta_pos, name="ventas-pos-crear"),
    
    # Nuevas URLs de Stripe + Facturación
    path("intent-pago/", crear_intent_pago, name="crear_intent_pago"),
    path("confirmar-pago/", confirmar_pago_venta, name="confirmar_pago_venta"),
    path("factura/<str:numero_factura>/", obtener_factura, name="obtener_factura"),
]