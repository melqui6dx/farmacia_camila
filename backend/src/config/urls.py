from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("core.urls")),                  # Autenticación y endpoints base
    path("api/inventarios/", include("inventarios.urls")),
    path("api/backups/", include("backup.urls")),        # Respaldos
    path("api/ventas/", include("ventas.urls")),
    path("api/carrito/", include("carrito.urls")),
    path("api/predicciones/", include("predicciones.urls")),
    path("api/reportes/", include("reportes.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
