import subprocess
import os
import tarfile
import datetime
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