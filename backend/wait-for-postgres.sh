#!/bin/bash
# Script para esperar a que PostgreSQL esté listo
set -e

host="$1"
shift
cmd="$@"

echo "Esperando a que PostgreSQL esté listo en $host..."

until PGPASSWORD=$POSTGRES_PASSWORD psql -h "$host" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q' 2>/dev/null; do
  >&2 echo "PostgreSQL no está disponible todavía - esperando..."
  sleep 2
done

>&2 echo "PostgreSQL está listo - iniciando aplicación"
exec $cmd
