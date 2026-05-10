#!/bin/sh
set -e

echo "Waiting for database..."
python manage.py wait_for_db

echo "Applying migrations..."
python manage.py migrate --noinput
mkdir -p /app/backups

exec "$@"
