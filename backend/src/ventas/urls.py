from django.urls import path

from .views import crear_venta_fisica, crear_venta_online

urlpatterns = [
    path("crear-fisica/", crear_venta_fisica, name="ventas-crear-fisica"),
    path("crear-online/", crear_venta_online, name="ventas-crear-online"),
]
