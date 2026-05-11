from rest_framework import serializers

from .models import Cliente


class ClienteSerializer(serializers.ModelSerializer):
    usuario_email = serializers.ReadOnlyField(source="usuario.email")

    class Meta:
        model = Cliente
        fields = [
            "id",
            "usuario",
            "usuario_email",
            "tipo",
            "nombres",
            "apellidos",
            "email",
            "telefono",
            "ci_nit",
            "estado",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "usuario_email"]

    def validate(self, attrs):
        instance = getattr(self, "instance", None)
        email = (attrs.get("email") or getattr(instance, "email", "") or "").strip().lower()
        ci_nit = (attrs.get("ci_nit") or getattr(instance, "ci_nit", "") or "").strip()

        if email:
            qs = Cliente.objects.filter(email__iexact=email)
            if instance is not None:
                qs = qs.exclude(pk=instance.pk)
            if qs.exists():
                raise serializers.ValidationError({"email": "Ya existe un cliente con este email en esta farmacia."})

        if ci_nit:
            qs = Cliente.objects.filter(ci_nit__iexact=ci_nit)
            if instance is not None:
                qs = qs.exclude(pk=instance.pk)
            if qs.exists():
                raise serializers.ValidationError({"ci_nit": "Ya existe un cliente con este CI/NIT en esta farmacia."})

        return attrs
