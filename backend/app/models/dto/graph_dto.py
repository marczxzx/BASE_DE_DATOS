from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


# ============================================================================
# DTOs para NODOS y ARISTAS (Graphology/Sigma.js/NetworkX)
# ============================================================================

class GraphNodeDTO(BaseModel):
    """Nodo del grafo para visualización."""
    id: str = Field(..., description="ID del nodo (usuario)")
    label: str = Field(..., description="Etiqueta del nodo (nombre completo)")
    x: float = Field(..., description="Coordenada X (latitud o layout)")
    y: float = Field(..., description="Coordenada Y (longitud o layout)")
    size: int = Field(default=10, description="Tamaño del nodo")
    color: str = Field(default="#95a5a6", description="Color del nodo")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Metadata adicional")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "1",
                "label": "Juan Pérez",
                "x": 40.4168,
                "y": -3.7038,
                "size": 15,
                "color": "#ff6b6b",
                "metadata": {
                    "edad": 30,
                    "hobby": "Fútbol",
                    "conexiones_count": 25
                }
            }
        }


class GraphEdgeDTO(BaseModel):
    """Arista del grafo para visualización."""
    id: str = Field(..., description="ID de la arista")
    source: str = Field(..., description="ID del nodo origen")
    target: str = Field(..., description="ID del nodo destino")
    size: int = Field(default=1, description="Grosor de la arista")
    color: str = Field(default="#cccccc", description="Color de la arista")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "e1",
                "source": "1",
                "target": "2",
                "size": 1,
                "color": "#cccccc"
            }
        }


class GraphStatsDTO(BaseModel):
    """Estadísticas del grafo."""
    total_nodes: int = Field(..., description="Total de nodos en el grafo")
    total_edges: int = Field(..., description="Total de aristas en el grafo")
    density: Optional[float] = Field(None, description="Densidad del grafo")
    avg_degree: Optional[float] = Field(None, description="Grado promedio")

    class Config:
        json_schema_extra = {
            "example": {
                "total_nodes": 500,
                "total_edges": 1250,
                "density": 0.005,
                "avg_degree": 2.5
            }
        }


class GraphDataDTO(BaseModel):
    """Datos del grafo (nodos + aristas)."""
    nodes: List[GraphNodeDTO] = Field(..., description="Lista de nodos")
    edges: List[GraphEdgeDTO] = Field(..., description="Lista de aristas")


class GraphResponseDTO(BaseModel):
    """Respuesta estándar para endpoints de grafos."""
    status_code: int = Field(..., description="Código de estado HTTP")
    message: str = Field(..., description="Mensaje de éxito")
    graph: GraphDataDTO = Field(..., description="Datos del grafo")
    stats: GraphStatsDTO = Field(..., description="Estadísticas del grafo")

    class Config:
        json_schema_extra = {
            "example": {
                "status_code": 200,
                "message": "Grafo obtenido exitosamente",
                "graph": {
                    "nodes": [
                        {
                            "id": "1",
                            "label": "Juan Pérez",
                            "x": 40.4168,
                            "y": -3.7038,
                            "size": 15,
                            "color": "#ff6b6b",
                            "metadata": {"edad": 30, "hobby": "Fútbol"}
                        }
                    ],
                    "edges": [
                        {"id": "e1", "source": "1", "target": "2", "size": 1, "color": "#ccc"}
                    ]
                },
                "stats": {
                    "total_nodes": 500,
                    "total_edges": 1250,
                    "density": 0.005,
                    "avg_degree": 2.5
                }
            }
        }


# ============================================================================
# DTOs para CAMINO MÁS CORTO (Shortest Path)
# ============================================================================

class PathNodeDTO(BaseModel):
    """Nodo en un camino."""
    id_usuario: int = Field(..., description="ID del usuario")
    nombre_completo: str = Field(..., description="Nombre completo del usuario")


class ShortestPathResponseDTO(BaseModel):
    """Respuesta de camino más corto entre dos usuarios."""
    status_code: int = Field(..., description="Código de estado HTTP")
    message: str = Field(..., description="Mensaje de éxito")
    path: List[PathNodeDTO] = Field(..., description="Camino desde origen a destino")
    length: int = Field(..., description="Longitud del camino (número de saltos)")
    exists: bool = Field(..., description="True si existe un camino")

    class Config:
        json_schema_extra = {
            "example": {
                "status_code": 200,
                "message": "Camino más corto encontrado",
                "path": [
                    {"id_usuario": 1, "nombre_completo": "Juan Pérez"},
                    {"id_usuario": 5, "nombre_completo": "María García"},
                    {"id_usuario": 10, "nombre_completo": "Carlos López"}
                ],
                "length": 2,
                "exists": True
            }
        }


# ============================================================================
# DTOs para RECOMENDACIONES (Friend-of-Friend)
# ============================================================================

class RecommendationDTO(BaseModel):
    """Recomendación de usuario (friend-of-friend)."""
    id_usuario: int = Field(..., description="ID del usuario recomendado")
    nombre_completo: str = Field(..., description="Nombre completo")
    common_friends: int = Field(..., description="Número de amigos en común")
    common_friends_ids: List[int] = Field(..., description="IDs de amigos en común")
    score: float = Field(..., description="Score de recomendación (0-1)")

    class Config:
        json_schema_extra = {
            "example": {
                "id_usuario": 42,
                "nombre_completo": "Ana Martínez",
                "common_friends": 3,
                "common_friends_ids": [1, 5, 7],
                "score": 0.85
            }
        }


class RecommendationsResponseDTO(BaseModel):
    """Respuesta de recomendaciones friend-of-friend."""
    status_code: int = Field(..., description="Código de estado HTTP")
    message: str = Field(..., description="Mensaje de éxito")
    user_id: int = Field(..., description="ID del usuario para quien se generan recomendaciones")
    recommendations: List[RecommendationDTO] = Field(..., description="Lista de usuarios recomendados")
    total: int = Field(..., description="Total de recomendaciones encontradas")

    class Config:
        json_schema_extra = {
            "example": {
                "status_code": 200,
                "message": "Recomendaciones generadas exitosamente",
                "user_id": 1,
                "recommendations": [
                    {
                        "id_usuario": 42,
                        "nombre_completo": "Ana Martínez",
                        "common_friends": 3,
                        "common_friends_ids": [5, 7, 9],
                        "score": 0.85
                    }
                ],
                "total": 10
            }
        }


# ============================================================================
# DTOs para DETECCIÓN DE COMUNIDADES
# ============================================================================

class CommunityDTO(BaseModel):
    """Comunidad detectada en el grafo."""
    community_id: int = Field(..., description="ID de la comunidad")
    members: List[int] = Field(..., description="IDs de usuarios en la comunidad")
    size: int = Field(..., description="Tamaño de la comunidad")
    density: Optional[float] = Field(None, description="Densidad interna de la comunidad")

    class Config:
        json_schema_extra = {
            "example": {
                "community_id": 1,
                "members": [1, 2, 3, 5, 7, 11],
                "size": 6,
                "density": 0.73
            }
        }


class CommunitiesResponseDTO(BaseModel):
    """Respuesta de detección de comunidades."""
    status_code: int = Field(..., description="Código de estado HTTP")
    message: str = Field(..., description="Mensaje de éxito")
    communities: List[CommunityDTO] = Field(..., description="Comunidades detectadas")
    total_communities: int = Field(..., description="Total de comunidades detectadas")
    algorithm: str = Field(..., description="Algoritmo utilizado")
    modularity: Optional[float] = Field(None, description="Modularidad del particionamiento")

    class Config:
        json_schema_extra = {
            "example": {
                "status_code": 200,
                "message": "Comunidades detectadas exitosamente",
                "communities": [
                    {
                        "community_id": 0,
                        "members": [1, 2, 3, 5, 7],
                        "size": 5,
                        "density": 0.7
                    },
                    {
                        "community_id": 1,
                        "members": [4, 6, 8, 9, 10, 11],
                        "size": 6,
                        "density": 0.65
                    }
                ],
                "total_communities": 2,
                "algorithm": "Louvain",
                "modularity": 0.42
            }
        }


# ============================================================================
# DTOs para CONEXIONES (All Connections)
# ============================================================================

class UsuarioConexionesDTO(BaseModel):
    """Conexiones de un usuario (lista de IDs)."""
    id_usuario: int = Field(..., description="ID del usuario")
    conexiones: List[int] = Field(..., description="Lista de IDs de usuarios conectados")

    class Config:
        json_schema_extra = {
            "example": {
                "id_usuario": 1,
                "conexiones": [5, 10, 25, 30, 42]
            }
        }


class ConexionesStatsDTO(BaseModel):
    """Estadísticas de conexiones del grafo."""
    total_usuarios_con_conexiones: int = Field(..., description="Total de usuarios que tienen al menos una conexión")
    total_conexiones: int = Field(..., description="Total de conexiones (aristas) en el grafo")

    class Config:
        json_schema_extra = {
            "example": {
                "total_usuarios_con_conexiones": 850,
                "total_conexiones": 2500
            }
        }


class AllConexionesResponseDTO(BaseModel):
    """Respuesta de todas las conexiones del grafo."""
    status_code: int = Field(..., description="Código de estado HTTP")
    message: str = Field(..., description="Mensaje de éxito")
    conexiones: List[UsuarioConexionesDTO] = Field(..., description="Lista de usuarios con sus conexiones")
    stats: ConexionesStatsDTO = Field(..., description="Estadísticas de conexiones")

    class Config:
        json_schema_extra = {
            "example": {
                "status_code": 200,
                "message": "Conexiones obtenidas exitosamente",
                "conexiones": [
                    {"id_usuario": 1, "conexiones": [5, 10, 25, 30, 42]},
                    {"id_usuario": 5, "conexiones": [1, 10, 15, 20]},
                    {"id_usuario": 10, "conexiones": [1, 5, 25]}
                ],
                "stats": {
                    "total_usuarios_con_conexiones": 850,
                    "total_conexiones": 2500
                }
            }
        }
