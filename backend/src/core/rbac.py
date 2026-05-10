from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
import re

ROLE_ADMIN = "admin"
ROLE_FARMACEUTICO = "farmaceutico"
ROLE_CAJERO = "cajero"
ROLE_CLIENTE = "cliente"

ROLES_DISPONIBLES = [ROLE_ADMIN, ROLE_FARMACEUTICO, ROLE_CAJERO, ROLE_CLIENTE]
ROLES_BASE = [ROLE_ADMIN, ROLE_FARMACEUTICO, ROLE_CAJERO, ROLE_CLIENTE]
ROLES_PROTEGIDOS = {ROLE_ADMIN}

PERMISOS_CATALOGO = {
    "usuarios.ver": "Puede ver usuarios",
    "usuarios.gestionar": "Puede gestionar usuarios",
    "productos.ver": "Puede ver productos",
    "productos.gestionar": "Puede gestionar productos",
    "inventario.ver": "Puede ver inventario",
    "inventario.gestionar": "Puede gestionar inventario",
    "inventario.registrar_entrada": "Puede registrar entradas de stock",
    "pedidos.ver": "Puede ver pedidos",
    "pedidos.gestionar": "Puede gestionar pedidos",
    "ventas.ver": "Puede ver ventas",
    "ventas.gestionar": "Puede gestionar ventas",
    "reportes.ver": "Puede ver reportes",
    "clientes.ver": "Puede ver clientes",
    "clientes.gestionar": "Puede gestionar clientes",
    "categorias.ver": "Puede ver categorias",
    "categorias.gestionar": "Puede gestionar categorias",
    "subcategorias.ver": "Puede ver subcategorias",
    "subcategorias.gestionar": "Puede gestionar subcategorias",
    "laboratorios.ver": "Puede ver laboratorios",
    "laboratorios.gestionar": "Puede gestionar laboratorios",
}

PERMISOS_ROL = {
    ROLE_ADMIN: set(PERMISOS_CATALOGO.keys()),
    ROLE_FARMACEUTICO: {
        "productos.ver",
        "productos.gestionar",
        "inventario.ver",
        "inventario.gestionar",
        "inventario.registrar_entrada",
        "pedidos.ver",
        "pedidos.gestionar",
        "ventas.ver",
        "ventas.gestionar",
        "reportes.ver",
        "clientes.ver",
        "categorias.ver",
        "categorias.gestionar",
        "subcategorias.ver",
        "subcategorias.gestionar",
        "laboratorios.ver",
        "laboratorios.gestionar",
    },
    ROLE_CAJERO: {
        "productos.ver",
        "pedidos.ver",
        "pedidos.gestionar",
        "ventas.ver",
        "ventas.gestionar",
        "reportes.ver",
        "clientes.ver",
        "clientes.gestionar",
        "categorias.ver",
        "subcategorias.ver",   
        "laboratorios.ver",     
    },
    ROLE_CLIENTE: set(),
}


def normalizar_nombre_rol(role_name: str) -> str:
    role = (role_name or "").strip().lower().replace(" ", "_")
    if not re.fullmatch(r"[a-z0-9_]{3,40}", role):
        raise ValueError("El nombre del rol debe tener entre 3 y 40 caracteres (a-z, 0-9, _).")
    return role


def _perm_to_codename(permission_code: str) -> str:
    return permission_code.replace(".", "_")


def _perm_to_django_name(permission_code: str) -> str:
    codename = _perm_to_codename(permission_code)
    return f"auth.{codename}"


def _user_content_type():
    user_model = get_user_model()
    return ContentType.objects.get_for_model(user_model)


def seed_roles_y_permisos():
    content_type = _user_content_type()

    permission_by_code = {}
    for permission_code, permission_name in PERMISOS_CATALOGO.items():
        codename = _perm_to_codename(permission_code)
        permission, _ = Permission.objects.get_or_create(
            codename=codename,
            content_type=content_type,
            defaults={"name": permission_name},
        )
        permission_by_code[permission_code] = permission

    for role in ROLES_BASE:
        group, _ = Group.objects.get_or_create(name=role)
        expected_permissions = [permission_by_code[code] for code in PERMISOS_ROL[role]]
        group.permissions.set(expected_permissions)


def obtener_roles_disponibles():
    return list(Group.objects.order_by("name").values_list("name", flat=True))


def obtener_catalogo_permisos():
    return sorted(PERMISOS_CATALOGO.keys())


def crear_rol(role_name, permission_codes):
    role = normalizar_nombre_rol(role_name)
    if role in ROLES_PROTEGIDOS:
        raise ValueError("El rol indicado esta protegido.")

    if Group.objects.filter(name=role).exists():
        raise ValueError("Ya existe un rol con ese nombre.")

    group = Group.objects.create(name=role)
    actualizar_permisos_rol(group, permission_codes)
    return group


def actualizar_permisos_rol(role_group, permission_codes):
    catalog = set(PERMISOS_CATALOGO.keys())
    invalid_codes = [code for code in permission_codes if code not in catalog]
    if invalid_codes:
        raise ValueError(f"Permisos no validos: {', '.join(invalid_codes)}")

    content_type = _user_content_type()
    django_permissions = []
    for code in permission_codes:
        codename = _perm_to_codename(code)
        permission = Permission.objects.filter(codename=codename, content_type=content_type).first()
        if permission:
            django_permissions.append(permission)

    role_group.permissions.set(django_permissions)
    return role_group


def obtener_permisos_rol(role_name):
    group = Group.objects.filter(name=role_name).first()
    if not group:
        return []

    known = set(PERMISOS_CATALOGO.keys())
    resolved = []
    for permission in group.permissions.all().order_by("codename"):
        code = permission.codename.replace("_", ".", 1)
        if code in known:
            resolved.append(code)
    return resolved


def obtener_rol_usuario(user):
    if user.is_superuser:
        return ROLE_ADMIN

    group_names = set(user.groups.values_list("name", flat=True))
    if ROLE_FARMACEUTICO in group_names:
        return ROLE_FARMACEUTICO
    if ROLE_CAJERO in group_names:
        return ROLE_CAJERO
    if ROLE_ADMIN in group_names:
        return ROLE_ADMIN
    if ROLE_CLIENTE in group_names:
        return ROLE_CLIENTE

    if group_names:
        return sorted(group_names)[0]

    if user.is_staff:
        return ROLE_FARMACEUTICO

    return ROLE_CLIENTE


def asignar_rol_usuario(user, role):
    role = normalizar_nombre_rol(role)

    group, _ = Group.objects.get_or_create(name=role)
    user.groups.clear()
    user.groups.add(group)

    if role == ROLE_ADMIN:
        user.is_superuser = True
        user.is_staff = True
    elif role in {ROLE_FARMACEUTICO, ROLE_CAJERO}:
        user.is_superuser = False
        user.is_staff = True
    else:
        user.is_superuser = False
        user.is_staff = False


def obtener_permisos_usuario(user):
    known = set(PERMISOS_CATALOGO.keys())
    resolved = set()

    for django_perm in user.get_all_permissions():
        app_label, codename = django_perm.split(".", 1)
        if app_label != "auth":
            continue
        permission_code = codename.replace("_", ".", 1)
        if permission_code in known:
            resolved.add(permission_code)

    return sorted(resolved)


def tiene_permiso(user, permission_code):
    if user.is_superuser:
        return True
    return user.has_perm(_perm_to_django_name(permission_code))


def puede_acceder_backoffice(user):
    if user.is_superuser:
        return True
    return any(
        tiene_permiso(user, permission_code)
        for permission_code in [
            "usuarios.ver",
            "productos.ver",
            "inventario.ver",
            "pedidos.ver",
            "ventas.ver",
            "reportes.ver",
            "clientes.ver",
            "categorias.ver",
            "laboratorios.ver"
        ]
    )


def sincronizar_roles_usuarios_existentes():
    user_model = get_user_model()
    for user in user_model.objects.all():
        if user.is_superuser:
            role = ROLE_ADMIN
        elif user.is_staff:
            role = ROLE_FARMACEUTICO
        else:
            role = ROLE_CLIENTE

        asignar_rol_usuario(user, role)
        user.save(update_fields=["is_superuser", "is_staff"])
