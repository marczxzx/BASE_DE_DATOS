#!/bin/bash
set -e

echo "Esperando a que PostgreSQL esté listo..."

# Esperar a que PostgreSQL esté disponible
while ! PGPASSWORD=$POSTGRES_PASSWORD psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q' 2>/dev/null; do
  echo "PostgreSQL no está disponible todavía - esperando..."
  sleep 2
done

echo "PostgreSQL está listo!"
echo "Iniciando aplicación FastAPI..."

# Ejecutar uvicorn
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
