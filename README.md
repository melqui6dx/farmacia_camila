# Sistema de Informacion - Monorepo

Monorepo de Farmacia con frontend web, backend API y cliente mobile.

- Backend: Django + DRF + JWT
- Frontend: React + Vite + Tailwind
- Base de datos: PostgreSQL
- Contenedores: Docker + Docker Compose
- Mobile: Flutter (separado)

## Estructura principal

```text
.
|-- backend/
|   |-- Dockerfile
|   |-- requirements.txt
|   |-- entrypoint.sh
|   `-- src/
|       |-- manage.py
|       `-- core/
|-- frontend/
|   |-- Dockerfile
|   |-- package.json
|   `-- src/
|-- mobile/
|   `-- README.md
|-- docker-compose.yml
`-- .env.example
```

## 1) Configuracion inicial

1. Copia `.env.example` a `.env`.
2. Ajusta variables de base de datos, backend y frontend.

## 2) Levantar el entorno con Docker

```bash
docker compose up --build
```

## Ver logs de frontend y backend
Logs en tiempo real de ambos servicios:
```bash
docker compose logs -f frontend backend
```
Solo logs de frontend:
```bash
docker compose logs -f frontend
```
Solo logs de backend:
```bash
docker compose logs -f backend
```
Ver las ultimas 100 lineas (sin seguir):
```bash
docker compose logs --tail=100 frontend backend
```

## 3) Comandos utiles (backend)

Aplicar migraciones:

```bash
docker compose exec backend python manage.py makemigrations
docker compose exec backend python manage.py migrate
```

Crear superusuario:

```bash
docker compose exec backend python manage.py createsuperuser
```

Crear productos
```bash
docker compose exec backend python manage.py seed_productos
```
Sembrar roles y permisos RBAC:

```bash
docker compose exec backend python manage.py seed_roles_permisos
```

Sembrar 5 usuarios demo para pruebas de gestion de usuarios:

```bash
docker compose exec backend python manage.py seed_usuarios_demo
```

Opcional: redefinir contrasena para todos los usuarios demo existentes:

```bash
docker compose exec backend python manage.py seed_usuarios_demo --reset-password --password "MiClaveSegura123*"
```

Usuarios creados por defecto:

- carlos.mendoza@saludplus.com (admin)
- ana.rojas@saludplus.com (farmaceutico)
- luis.torrez@saludplus.com (cajero)
- maria.quispe@saludplus.com (cliente)
- jorge.vargas@saludplus.com (cliente)

Contrasena por defecto: `SaludPlus2026*`

Sembrar 10 laboratorios demo para pruebas de gestion de laboratorios:

```bash
docker compose exec backend python manage.py seed_laboratorios_demos
```

Sembrar 10 categorias con sus respectivas subcat. demo para pruebas de gestion de categorias:

```bash
docker compose exec backend python manage.py seed_categorias_subcategorias_demos
```
## 4) Mobile (Flutter)

Dentro de `mobile/`:

```bash
flutter create .
flutter run
```
comando para crear apps con docker:

docker compose exec backend python src/manage.py startapp inventario

## Notas

- No guardar credenciales reales en el README.
- Para desarrollo local, usar usuarios de prueba en `.env` o en seeds internas.

# Ver desde el contenedor backend
docker compose exec backend python -c "import os; print('SECRET:', os.environ.get('STRIPE_SECRET_KEY', 'NO'))"
docker compose exec backend python -c "import os; print('PUBLIC:', os.environ.get('STRIPE_PUBLIC_KEY', 'NO'))"

