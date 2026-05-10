from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import BackupLog
from .serializers import BackupLogSerializer
from django.core.management import call_command

class BackupViewSet(viewsets.ViewSet):
    
    @action(detail=False, methods=['post'])
    def crear(self, request):
        """Ejecuta un backup manual"""
        try:
            call_command('backup_db', type='manual')
            return Response(
                {'message': 'Backup creado exitosamente'}, 
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def historial(self, request):
        """Lista los últimos backups realizados"""
        logs = BackupLog.objects.all()[:50]  # Últimos 50 registros
        serializer = BackupLogSerializer(logs, many=True)
        return Response(serializer.data)