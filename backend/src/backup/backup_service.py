import subprocess
import os
import tarfile
import datetime
import tempfile
from django.conf import settings
from io import BytesIO

def create_backup():
    """Realiza el backup de la BD y los media. Devuelve (ruta_archivo, tamaño) o lanza excepción."""
    now = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_dir = settings.BACKUP_DIR  # definiremos en settings
    os.makedirs(backup_dir, exist_ok=True)
    
    # 1. Volcado de PostgreSQL
    db_settings = settings.DATABASES['default']
    backup_file = os.path.join(backup_dir, f'backup_{now}.dump')
    pg_dump_cmd = f"pg_dump -h {db_settings['HOST']} -U {db_settings['USER']} -d {db_settings['NAME']} -F c -f {backup_file}"
    # Configurar variable de entorno PGPASSWORD para no pedir contraseña
    env = os.environ.copy()
    env['PGPASSWORD'] = db_settings['PASSWORD']
    
    try:
        subprocess.run(pg_dump_cmd, shell=True, check=True, env=env, capture_output=True)
    except subprocess.CalledProcessError as e:
        raise Exception(f"Error en pg_dump: {e.stderr.decode()}")
    
    # 2. Crear un tar con el dump + media
    tar_file = os.path.join(backup_dir, f'backup_{now}.tar.gz')
    with tarfile.open(tar_file, 'w:gz') as tar:
        tar.add(backup_file, arcname=os.path.basename(backup_file))
        # Agregar carpeta media (solo si existe)
        media_root = settings.MEDIA_ROOT
        if os.path.exists(media_root):
            tar.add(media_root, arcname='media')
    
    # Limpiar el dump individual (ya incluido en el tar)
    os.remove(backup_file)
    
    file_size = os.path.getsize(tar_file)
    return tar_file, file_size


def restore_backup(file_path, schema_name):
    """
    Restaura el esquema de un tenant específico desde un archivo de backup.
    Solo restaura objetos del schema indicado, sin afectar otros tenants.
    """
    if not os.path.exists(file_path):
        raise Exception(f"Archivo de backup no encontrado: {file_path}")

    db_settings = settings.DATABASES['default']
    env = os.environ.copy()
    env['PGPASSWORD'] = db_settings['PASSWORD']

    with tempfile.TemporaryDirectory() as tmpdir:
        # Extraer el .dump del tar.gz
        with tarfile.open(file_path, 'r:gz') as tar:
            dump_members = [m for m in tar.getmembers() if m.name.endswith('.dump')]
            if not dump_members:
                raise Exception("No se encontró archivo .dump en el backup")
            # Extracción segura: solo archivos, sin rutas absolutas ni traversal
            member = dump_members[0]
            member_path = os.path.realpath(os.path.join(tmpdir, member.name))
            if not member_path.startswith(os.path.realpath(tmpdir)):
                raise Exception("Path traversal detectado en el archivo de backup")
            tar.extract(member, path=tmpdir)
            dump_file = os.path.join(tmpdir, member.name)

        # Restaurar solo el schema del tenant con pg_restore
        # Usamos lista de argumentos (sin shell=True) para evitar inyección de comandos
        pg_restore_cmd = [
            'pg_restore',
            '-h', db_settings['HOST'],
            '-p', str(db_settings.get('PORT', 5432)),
            '-U', db_settings['USER'],
            '-d', db_settings['NAME'],
            f'--schema={schema_name}',
            '--clean',
            '--if-exists',
            '--no-owner',
            '--no-privileges',
            '--no-comments',
            '-F', 'c',
            dump_file,
        ]

        result = subprocess.run(
            pg_restore_cmd,
            env=env,
            capture_output=True,
            text=True,
        )

        # pg_restore devuelve código 1 para advertencias no fatales; >1 es error real
        if result.returncode > 1:
            raise Exception(f"Error en pg_restore: {result.stderr[:2000]}")

    return True