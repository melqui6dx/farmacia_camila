from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from clientes.models import Cliente
from core.audit import log_system_event

from .serializers import VentaCreateInputSerializer, VentaSerializer
from .services import VentaServiceError, crear_venta_service


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
