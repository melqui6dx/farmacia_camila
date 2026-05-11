from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from inventarios.models import Categoria, Inventario, Laboratorio, Producto


class CarritoApiFlowTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(username="cliente1", email="c1@test.com", password="pass1234")

        categoria = Categoria.objects.create(nombre="Analgesicos")
        laboratorio = Laboratorio.objects.create(nombre="Lab Test")
        self.producto = Producto.objects.create(
            sku="SKU-1", nombre_comercial="Paracetamol", categoria=categoria, laboratorio=laboratorio,
            forma_farmaceutica="tableta", presentacion="caja x 10", unidad_medida="caja",
            precio_compra=Decimal("7.00"), precio_venta=Decimal("20.00"), stock_minimo=1, estado=True, requiere_receta=False,
        )
        inv = Inventario.objects.get(producto=self.producto)
        inv.stock_actual = 20
        inv.save(update_fields=["stock_actual", "updated_at"])

    def test_agregar_item_al_carrito(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post("/api/carrito/agregar/", {"producto_id": self.producto.id, "cantidad": 1}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("id", response.data)
        self.assertEqual(response.data["estado"], "activo")

    def test_listar_carrito(self):
        self.client.force_authenticate(user=self.user)
        self.client.post("/api/carrito/agregar/", {"producto_id": self.producto.id, "cantidad": 2}, format="json")
        
        response = self.client.get("/api/carrito/listar/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["items"]), 1)
        self.assertEqual(response.data["items"][0]["cantidad"], 2)
