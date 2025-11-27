from fastapi import APIRouter

from app.api.v1.routes import usuarios, graph, hobbies

api_router = APIRouter()

# Incluir todos los módulos de rutas
api_router.include_router(usuarios.router)
api_router.include_router(graph.router)
api_router.include_router(hobbies.router)
