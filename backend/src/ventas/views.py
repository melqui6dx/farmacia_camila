from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from decimal import Decimal

from clientes.models import Cliente
from core.audit import log_system_event
from carrito.models import Carrito

from .serializers import POSVentaInputSerializer, VentaCreateInputSerializer, VentaSerializer
from .services import VentaServiceError, crear_venta_service, crear_payment_intent, verificar_payment_intent
from .models import Factura


# ========== VENTAS EXISTENTES ==========

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def crear_venta_fisica(request):
    serializer = VentaCreateInputSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    data = serializer.validated_data
    cliente = get_object_or_404(Cliente, id=data["cliente_id"], estado=True)

    try:
        venta = crear_venta_service(
            cliente=cliente,
            items=data["items"],
            origen="fisica",
            vendedor=request.user,
            estado=data.get("estado", "pendiente"),
            descuento=data.get("descuento", 0),
            impuesto=data.get("impuesto", 0),
            observacion=data.get("observacion", ""),
        )
    except VentaServiceError as exc:
        log_system_event(
            request=request,
            accion="CREATE",
            modulo="ventas",
            resultado="FAILURE",
            mensaje=f"Error en venta fisica: {str(exc)}",
            entidad="Venta",
            entidad_id="",
        )
        return Response({"detail": str(exc), "code": exc.code}, status=status.HTTP_400_BAD_REQUEST)

    log_system_event(
        request=request,
        accion="CREATE",
        modulo="ventas",
        resultado="SUCCESS",
        mensaje=f"Venta fisica creada #{venta.id}",
        entidad="Venta",
        entidad_id=str(venta.id),
    )

    return Response(VentaSerializer(venta).data, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([AllowAny])
def crear_venta_online(request):
    serializer = VentaCreateInputSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    data = serializer.validated_data
    cliente = get_object_or_404(Cliente, id=data["cliente_id"], estado=True)

    try:
        venta = crear_venta_service(
            cliente=cliente,
            items=data["items"],
            origen="online",
            vendedor=None,
            estado=data.get("estado", "pendiente"),
            descuento=data.get("descuento", 0),
            impuesto=data.get("impuesto", 0),
            observacion=data.get("observacion", ""),
        )
    except VentaServiceError as exc:
        log_system_event(
            request=request,
            accion="CREATE",
            modulo="ventas",
            resultado="FAILURE",
            mensaje=f"Error en venta online: {str(exc)}",
            entidad="Venta",
            entidad_id="",
        )
        return Response({"detail": str(exc), "code": exc.code}, status=status.HTTP_400_BAD_REQUEST)

    log_system_event(
        request=request,
        accion="CREATE",
        modulo="ventas",
        resultado="SUCCESS",
        mensaje=f"Venta online creada #{venta.id}",
        entidad="Venta",
        entidad_id=str(venta.id),
        usuario=request.user if getattr(request, "user", None) and request.user.is_authenticated else None,
    )

    return Response(VentaSerializer(venta).data, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def crear_venta_pos(request):
    from core.rbac import tiene_permiso, ROLE_CAJERO

    if not (tiene_permiso(request.user, "ventas.gestionar") or request.user.groups.filter(name=ROLE_CAJERO).exists() or request.user.is_superuser):
        return Response({"detail": "No tienes permiso para realizar ventas POS."}, status=status.HTTP_403_FORBIDDEN)

    serializer = POSVentaInputSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    data = serializer.validated_data
    cliente_id = data.get("cliente_id")
    cliente_data = data.get("cliente_data")

    if cliente_id:
        cliente = get_object_or_404(Cliente, id=cliente_id, estado=True)
    else:
        cliente = Cliente.objects.create(
            tipo="invitado",
            nombres=cliente_data.get("nombres", "Cliente"),
            apellidos=cliente_data.get("apellidos", "Mostrador"),
            email=cliente_data.get("email", ""),
            telefono=cliente_data.get("telefono", ""),
            ci_nit=cliente_data.get("ci_nit", ""),
            estado=True,
        )

    try:
        venta = crear_venta_service(
            cliente=cliente,
            items=data["items"],
            origen="fisica",
            vendedor=request.user,
            estado=data.get("estado", "pagada"),
            descuento=data.get("descuento", 0),
            impuesto=data.get("impuesto", 0),
            observacion=data.get("observacion", ""),
        )
    except VentaServiceError as exc:
        log_system_event(
            request=request,
            accion="CREATE",
            modulo="ventas",
            resultado="FAILURE",
            mensaje=f"Error en venta POS: {str(exc)}",
            entidad="Venta",
            entidad_id="",
        )
        return Response({"detail": str(exc), "code": exc.code}, status=status.HTTP_400_BAD_REQUEST)

    log_system_event(
        request=request,
        accion="CREATE",
        modulo="ventas",
        resultado="SUCCESS",
        mensaje=f"Venta POS creada #{venta.id}",
        entidad="Venta",
        entidad_id=str(venta.id),
    )

    return Response(VentaSerializer(venta).data, status=status.HTTP_201_CREATED)


# ========== NUEVAS VISTAS DE STRIPE Y FACTURACIÓN ==========

@api_view(['POST'])
@permission_classes([AllowAny])
def crear_intent_pago(request):
    """
    POST /api/ventas/intent-pago/
    Body: { "total": 150.50 }
    """
    total = request.data.get('total')
    
    if not total:
        return Response(
            {'detail': 'El campo "total" es requerido.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        total_decimal = Decimal(str(total))
    except:
        return Response(
            {'detail': 'Total inválido.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if total_decimal <= 0:
        return Response(
            {'detail': 'El total debe ser mayor a 0.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        intent_data = crear_payment_intent(total_decimal)
        return Response(intent_data, status=status.HTTP_200_OK)
    except Exception as e:
        log_system_event(
            request=request,
            accion='CREAR_INTENT_PAGO',
            modulo='ventas',
            resultado='FAILURE',
            mensaje=f'Error Stripe: {str(e)}'
        )
        return Response(
            {'detail': f'Error al crear el intent de pago: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def confirmar_pago_venta(request):
    """
    POST /api/ventas/confirmar-pago/
    Body: {
        "payment_intent_id": "pi_xxxxxxxx",
        "carrito_token": "token_del_carrito",
        "datos_factura": {
            "nombre_cliente": "Juan Perez",
            "email_cliente": "juan@email.com"
        }
    }
    """
    payment_intent_id = request.data.get('payment_intent_id')
    carrito_token = request.data.get('carrito_token', '')
    datos_factura = request.data.get('datos_factura', {})
    
    if not payment_intent_id:
        return Response(
            {'detail': 'payment_intent_id es requerido.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # 1. Verificar el pago en Stripe
    try:
        intent_info = verificar_payment_intent(payment_intent_id)
    except Exception as e:
        log_system_event(
            request=request,
            accion='CONFIRMAR_PAGO',
            modulo='ventas',
            resultado='FAILURE',
            mensaje=f'Error al verificar pago Stripe: {str(e)}'
        )
        return Response(
            {'detail': f'Error al verificar el pago: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if intent_info['status'] != 'succeeded':
        return Response(
            {'detail': f'El pago no fue exitoso. Estado: {intent_info["status"]}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # 2. Obtener el carrito activo
    usuario = request.user if request.user.is_authenticated else None
    
    if usuario:
        carrito = Carrito.objects.filter(usuario=usuario, estado='activo').first()
    else:
        if not carrito_token:
            return Response(
                {'detail': 'carrito_token requerido para usuarios invitados.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        carrito = Carrito.objects.filter(invitado_token=carrito_token, estado='activo').first()
    
    if not carrito:
        return Response(
            {'detail': 'Carrito activo no encontrado.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # 3. Validar que el carrito tenga items
    items = list(carrito.items.select_related('producto').all())
    if not items:
        return Response(
            {'detail': 'El carrito está vacío.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # 4. Obtener o crear el cliente
    nombre_cliente = datos_factura.get('nombre_cliente', 'Cliente')
    email_cliente = datos_factura.get('email_cliente', '')
    telefono = datos_factura.get('telefono', '')
    
    if usuario:
        cliente, created = Cliente.objects.get_or_create(
            usuario=usuario,
            defaults={
                'nombres': nombre_cliente,
                'apellidos': '',
                'email': email_cliente,
                'telefono': telefono,
                'tipo': 'registrado',
                'estado': True,
            }
        )
    else:
        cliente = Cliente.objects.create(
            tipo='invitado',
            nombres=nombre_cliente,
            apellidos='',
            email=email_cliente,
            telefono=telefono,
            estado=True,
        )
    
    # 5. Construir items para crear_venta_service
    venta_items = [
        {
            'producto_id': item.producto_id,
            'cantidad': item.cantidad,
            'precio_unitario': item.precio_unitario,
        }
        for item in items
    ]
    
    # 6. Calcular total del carrito (opcional, para validación)
    total_carrito = sum(item.subtotal for item in items)
    
    # 7. Crear la venta (con factura automática)
    try:
        venta = crear_venta_service(
            cliente=cliente,
            items=venta_items,
            origen='online',
            vendedor=None,
            estado='pagada',
            descuento=0,
            impuesto=0,
            observacion=f'Pago con Stripe - Intent ID: {payment_intent_id}',
            datos_factura=datos_factura,
        )
    except VentaServiceError as exc:
        log_system_event(
            request=request,
            accion='CONFIRMAR_PAGO',
            modulo='ventas',
            resultado='FAILURE',
            mensaje=f'Error crear venta: {str(exc)}'
        )
        return Response(
            {'detail': str(exc), 'code': exc.code},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as exc:
        log_system_event(
            request=request,
            accion='CONFIRMAR_PAGO',
            modulo='ventas',
            resultado='FAILURE',
            mensaje=f'Error inesperado crear venta: {str(exc)}'
        )
        return Response(
            {'detail': f'Error al crear la venta: {str(exc)}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # 8. Marcar carrito como confirmado
    carrito.estado = 'confirmado'
    carrito.save(update_fields=['estado', 'updated_at'])
    
    # 9. Obtener la factura generada
    factura = venta.factura
    
    # 10. Log de éxito
    log_system_event(
        request=request,
        accion='CONFIRMAR_PAGO',
        modulo='ventas',
        resultado='SUCCESS',
        mensaje=f'Venta #{venta.id} pagada con Stripe. Factura: {factura.numero_factura}',
        entidad='Venta',
        entidad_id=str(venta.id),
    )
    
    # 11. Respuesta al frontend
    return Response({
        'venta': VentaSerializer(venta).data,
        'factura': {
            'numero': factura.numero_factura,
            'nombre_cliente': factura.nombre_cliente,
            'email_cliente': factura.email_cliente,
            'fecha_emision': factura.fecha_emision,
        }
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([AllowAny])
def obtener_factura(request, numero_factura):
    """
    GET /api/ventas/factura/{numero}/
    """
    try:
        factura = Factura.objects.select_related('venta__cliente').get(numero_factura=numero_factura)
    except Factura.DoesNotExist:
        return Response(
            {'detail': 'Factura no encontrada.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Serializar manualmente (o usar serializer si lo prefieres)
    data = {
        'id': factura.id,
        'numero_factura': factura.numero_factura,
        'tipo': factura.tipo,
        'nombre_cliente': factura.nombre_cliente,
        'email_cliente': factura.email_cliente,
        'nit_ci': factura.nit_ci,
        'fecha_emision': factura.fecha_emision,
        'venta': {
            'id': factura.venta.id,
            'total': str(factura.venta.total),
            'fecha': factura.venta.created_at,
        },
        'items': [
            {
                'producto': d.producto.nombre_comercial,
                'cantidad': d.cantidad,
                'precio_unitario': str(d.precio_unitario),
                'subtotal': str(d.subtotal)
            }
            for d in factura.venta.detalles.all()
        ]
    }
    
    return Response(data, status=status.HTTP_200_OK)