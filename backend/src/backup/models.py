from django.db import models
from tenants.mixins import TenantAwareModel

class BackupLog(TenantAwareModel):
    BACKUP_TYPES = [
        ('manual', 'Manual'),
        ('auto', 'Automático'),  # Lo dejo por si en futuro se automatiza
    ]
    STATUS_CHOICES = [
        ('success', 'Éxito'),
        ('failed', 'Fallido'),
    ]

    timestamp = models.DateTimeField(auto_now_add=True)
    backup_type = models.CharField(max_length=10, choices=BACKUP_TYPES, default='manual')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES)
    file_path = models.CharField(max_length=500, blank=True, null=True)
    file_size = models.BigIntegerField(null=True, blank=True)
    error_message = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Registro de Backup'
        verbose_name_plural = 'Registros de Backup'

    def __str__(self):
        return f"Backup {self.timestamp} - {self.status}"