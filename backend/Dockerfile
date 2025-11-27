# Python 3.11 slim como imagen base
FROM python:3.11-slim

# Establecer directorio de trabajo
WORKDIR /app

# Variables de entorno para Python
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements y instalar dependencias Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código de la aplicación
COPY . .

# Exponer puerto 8000
EXPOSE 8000

# Comando que espera a PostgreSQL antes de iniciar la aplicación
CMD ["/bin/bash", "-c", "echo 'Esperando a PostgreSQL...' && \
     while ! PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB -c '\\q' 2>/dev/null; do \
       echo 'PostgreSQL no está disponible todavía - esperando...'; \
       sleep 2; \
     done && \
     echo 'PostgreSQL está listo!' && \
     echo 'Iniciando aplicación FastAPI...' && \
     uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"]
