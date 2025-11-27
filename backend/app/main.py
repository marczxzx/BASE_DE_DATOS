from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from app.core.config import settings
from app.api.v1.router import api_router
from db.database import db_connection


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manejador de eventos de ciclo de vida de la aplicación.
    Maneja startup y shutdown de forma moderna usando context manager.
    """
    # Startup: Inicializar conexión a base de datos
    db_connection.connect()
    print(f"Conectado a la base de datos: {settings.POSTGRES_DB}")
    print(f"Grafo activo: {settings.GRAPH_NAME}")

    yield

    # Shutdown: Cerrar conexión a base de datos
    db_connection.close()
    print("Conexion a la base de datos cerrada")


def create_application() -> FastAPI:
    """
    Función factoría para crear aplicación FastAPI.
    Sigue el Principio de Responsabilidad Única - solo configura la app.
    """

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="API REST para analisis de grafos sociales usando PostgreSQL con Apache AGE",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan
    )

    # Configurar CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # En producción, especificar orígenes reales
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Manejador de excepciones personalizado para HTTPException
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        """
        Manejador personalizado de HTTPException.
        Agrega status_code al response para mantener formato consistente.
        """
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "status_code": exc.status_code,
                "detail": exc.detail
            }
        )

    # Incluir rutas API
    app.include_router(api_router, prefix=settings.API_V1_PREFIX)

    return app


# Crear instancia de aplicación
app = create_application()


@app.get("/", tags=["Root"])
async def root():
    """Endpoint raíz con información de API."""
    return {
        "message": "Social Graph Analyzer API",
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "redoc": "/redoc"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Endpoint de verificación de salud."""
    try:
        # Probar conexión a base de datos
        with db_connection.get_cursor() as cursor:
            cursor.execute("SELECT 1")

        return {
            "status": "healthy",
            "database": "connected",
            "graph": settings.GRAPH_NAME
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
