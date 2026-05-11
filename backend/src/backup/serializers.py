from rest_framework import serializers
from .models import BackupLog

class BackupLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = BackupLog
        fields = '__all__'