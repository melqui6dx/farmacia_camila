from decimal import Decimal
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from clientes.models import Cliente, RecetaMedica
from inventarios.models import Categoria, Inventario, Laboratorio, Producto


class CarritoApiFlowTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(username="cliente1", email="c1@test.com", password="pass1234")
        self.cliente = Cliente.objects.create(usuario=self.user, tipo="registrado", nombres="Cliente", email="c1@test.com")

        categoria = Categoria.objects.create(nombre="Analgesicos")
        laboratorio = Laboratorio.objects.create(nombre="Lab Test")
        self.producto_receta = Producto.objects.create(
            sku="SKU-2", nombre_comercial="Controlado", categoria=categoria, laboratorio=laboratorio,
            forma_farmaceutica="tableta", presentacion="caja x 10", unidad_medida="caja",
            precio_compra=Decimal("7.00"), precio_venta=Decimal("20.00"), stock_minimo=1, estado=True, requiere_receta=True,
        )
        inv = Inventario.objects.get(producto=self.producto_receta)
        inv.stock_actual = 20
        inv.save(update_fields=["stock_actual", "updated_at"])

        self.receta_ok = RecetaMedica.objects.create(
            cliente=self.cliente,
            codigo="RX-OK",
            estado="aprobada",
            fecha_vencimiento=timezone.localdate() + timedelta(days=5),
        )

    def test_confirmar_requiere_receta_en_payload(self):
        self.client.force_authenticate(user=self.user)
        self.client.post("/api/carrito/agregar/", {"cliente_id": self.cliente.id, "producto_id": self.producto_receta.id, "cantidad": 1}, format="json")

        sin_receta = self.client.post("/api/carrito/confirmar/", {"cliente_id": self.cliente.id}, format="json")
        self.assertEqual(sin_receta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(sin_receta.data.get("code"), "receta_requerida")

        con_receta = self.client.post(
            "/api/carrito/confirmar/",
            {"cliente_id": self.cliente.id, "recetas": [{"producto_id": self.producto_receta.id, "receta_id": self.receta_ok.id}]},
            format="json",
        )
        self.assertEqual(con_receta.status_code, status.HTTP_201_CREATED)
