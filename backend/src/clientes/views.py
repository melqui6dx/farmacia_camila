from rest_framework import filters, status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.audit import log_system_event

from .models import Cliente
from .serializers import ClienteSerializer


class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["nombres", "apellidos", "email", "telefono", "ci_nit"]
    ordering_fields = ["nombres", "apellidos", "email", "created_at"]
    ordering = ["nombres", "apellidos"]

    def get_queryset(self):
        queryset = super().get_queryset()
        estado = self.request.query_params.get("estado")
        tipo = self.request.query_params.get("tipo")

        if estado is not None:
            queryset = queryset.filter(estado=estado.lower() == "true")

        if tipo:
            queryset = queryset.filter(tipo=tipo)

        return queryset

    def perform_create(self, serializer):
        instance = serializer.save()
        log_system_event(
            request=self.request,
            accion="CREATE",
            modulo="clientes",
            resultado="SUCCESS",
            mensaje=f"Cliente creado: {instance.nombres} {instance.apellidos}".strip(),
            entidad="Cliente",
            entidad_id=str(instance.id),
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        log_system_event(
            request=self.request,
            accion="UPDATE",
            modulo="clientes",
            resultado="SUCCESS",
            mensaje=f"Cliente actualizado: {instance.nombres} {instance.apellidos}".strip(),
            entidad="Cliente",
            entidad_id=str(instance.id),
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.estado = False
        instance.save(update_fields=["estado", "updated_at"])

        log_system_event(
            request=request,
            accion="DELETE",
            modulo="clientes",
            resultado="SUCCESS",
            mensaje=f"Cliente desactivado: {instance.nombres} {instance.apellidos}".strip(),
            entidad="Cliente",
            entidad_id=str(instance.id),
        )

        return Response(status=status.HTTP_204_NO_CONTENT)
