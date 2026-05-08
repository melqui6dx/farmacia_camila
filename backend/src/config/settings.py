import os
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "change-me")
DEBUG = os.getenv("DJANGO_DEBUG", "True").lower() == "true"

ALLOWED_HOSTS = [
    h.strip()
    for h in os.getenv("DJANGO_ALLOWED_HOSTS", "127.0.0.1,localhost").split(",")
    if h.strip()
]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "core",
    "clientes",
    "ventas",
    "carrito",
    "inventarios",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("POSTGRES_DB", "app_db"),
        "USER": os.getenv("POSTGRES_USER", "app_user"),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD", "app_password"),
        "HOST": os.getenv("POSTGRES_HOST", "localhost"),
        "PORT": os.getenv("POSTGRES_PORT", "5432"),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "es-es"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

PASSWORD_RESET_TIMEOUT = int(os.getenv("DJANGO_PASSWORD_RESET_TIMEOUT", "900"))

EMAIL_BACKEND = os.getenv(
    "DJANGO_EMAIL_BACKEND",
    "django.core.mail.backends.console.EmailBackend",
)
DEFAULT_FROM_EMAIL = os.getenv("DJANGO_DEFAULT_FROM_EMAIL", "no-reply@saludplus.local")
FRONTEND_RESET_PASSWORD_URL = os.getenv(
    "FRONTEND_RESET_PASSWORD_URL",
    "http://localhost:5173/reset-password",
)
FRONTEND_VERIFY_EMAIL_URL = os.getenv(
    "FRONTEND_VERIFY_EMAIL_URL",
    "http://localhost:5173/verify-email",
)

CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:53400").split(",")
    if origin.strip()
]
CORS_ALLOW_CREDENTIALS = True

# En modo DEBUG, permitir todos los orígenes para facilitar desarrollo
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True

AUTH_ACCESS_COOKIE_NAME = os.getenv("AUTH_ACCESS_COOKIE_NAME", "access_token")
AUTH_REFRESH_COOKIE_NAME = os.getenv("AUTH_REFRESH_COOKIE_NAME", "refresh_token")
AUTH_ACCESS_COOKIE_AGE = int(os.getenv("AUTH_ACCESS_COOKIE_AGE", "900"))
AUTH_REFRESH_COOKIE_AGE = int(os.getenv("AUTH_REFRESH_COOKIE_AGE", "604800"))
AUTH_COOKIE_SECURE = os.getenv("AUTH_COOKIE_SECURE", "False").lower() == "true"
AUTH_COOKIE_SAMESITE = os.getenv("AUTH_COOKIE_SAMESITE", "Lax")

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "core.authentication.CookieOrHeaderJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.AllowAny",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 8,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(seconds=AUTH_ACCESS_COOKIE_AGE),
    "REFRESH_TOKEN_LIFETIME": timedelta(seconds=AUTH_REFRESH_COOKIE_AGE),
    "ROTATE_REFRESH_TOKENS": False,
    "BLACKLIST_AFTER_ROTATION": False,
}

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": os.getenv("DJANGO_CACHE_LOCATION", "saludplus-cache"),
    }
}

AUTH_RATE_LIMIT_WINDOW_SEC = int(os.getenv("AUTH_RATE_LIMIT_WINDOW_SEC", "60"))
AUTH_LOGIN_MAX_REQUESTS_PER_IP = int(os.getenv("AUTH_LOGIN_MAX_REQUESTS_PER_IP", "20"))
AUTH_REGISTER_MAX_REQUESTS_PER_IP = int(os.getenv("AUTH_REGISTER_MAX_REQUESTS_PER_IP", "10"))
AUTH_RESET_MAX_REQUESTS_PER_IP = int(os.getenv("AUTH_RESET_MAX_REQUESTS_PER_IP", "10"))

AUTH_LOGIN_LOCK_THRESHOLD = int(os.getenv("AUTH_LOGIN_LOCK_THRESHOLD", "5"))
AUTH_LOGIN_LOCK_BASE_SEC = int(os.getenv("AUTH_LOGIN_LOCK_BASE_SEC", "60"))
AUTH_LOGIN_LOCK_MAX_SEC = int(os.getenv("AUTH_LOGIN_LOCK_MAX_SEC", "900"))
AUTH_LOGIN_FAILURE_TTL_SEC = int(os.getenv("AUTH_LOGIN_FAILURE_TTL_SEC", "86400"))
