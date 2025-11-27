from fastapi import APIRouter, Depends, Query, status

from app.models.dto.graph_dto import (
    ShortestPathResponseDTO,
    RecommendationsResponseDTO,
    GraphResponseDTO,
    CommunitiesResponseDTO,
    AllConexionesResponseDTO
)
from app.services.graph_service import GraphService
from app.repositories.graph_repository import GraphRepository
from app.repositories.usuario_repository import UsuarioRepository
from db.database import get_db, DatabaseConnection


router = APIRouter(
    prefix="/graph",
    tags=["Análisis de Grafos"]
)


def get_graph_service(db: DatabaseConnection = Depends(get_db)) -> GraphService:
    """
    Inyección de dependencias para GraphService.
    """
    graph_repository = GraphRepository(db)
    usuario_repository = UsuarioRepository(db)
    return GraphService(graph_repository, usuario_repository)


# ============================================================================
# CAMINO MÁS CORTO (Shortest Path)
# ============================================================================

@router.get(
    "/shortest-path/{id_origen}/{id_destino}",
    response_model=ShortestPathResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Camino más corto entre dos usuarios",
    description="Encuentra el camino más corto entre dos usuarios usando BFS con límite de profundidad."
)
def get_shortest_path(
    id_origen: int,
    id_destino: int,
    max_depth: int = Query(3, ge=1, le=5, description="Profundidad máxima de búsqueda (grados de separación)"),
    service: GraphService = Depends(get_graph_service)
) -> ShortestPathResponseDTO:
    """
    Encuentra el camino más corto entre dos usuarios.

    **Algoritmo:** Breadth-First Search (BFS) ITERATIVO

    **Optimización (BFS Iterativo Verdadero):**
    - Busca primero depth=1, luego depth=2, luego depth=3, etc.
    - Se detiene EN CUANTO encuentra un camino (que será el más corto)
    - NO explora profundidades innecesarias
    - 5-10x más rápido que el enfoque de "encontrar todos y ordenar"
    - Optimizado para grafos grandes

    **Casos de uso:**
    - Análisis de redes sociales
    - Cálculo de grados de separación
    - Análisis de influencia

    **Parámetros:**
    - **id_origen**: ID del usuario origen
    - **id_destino**: ID del usuario destino
    - **max_depth**: Profundidad máxima de búsqueda (1-5, default: 3, recomendado para grafos grandes)

    **Respuesta:**
    - Lista de usuarios en el camino (ordenados desde origen a destino)
    - Longitud del camino (número de saltos/aristas)
    - Flag indicando si existe un camino dentro de max_depth

    **Ejemplo:**
    ```
    GET /api/v1/graph/shortest-path/1/100?max_depth=6
    ```

    **Performance (BFS Iterativo):**
    - Camino de longitud 1: < 0.5s
    - Camino de longitud 2: < 2s
    - Camino de longitud 3: < 5s
    - No existe camino (max_depth=3): < 8s

    **Ventaja vs método anterior:**
    - Si hay camino corto (depth=1-2): 5-10x más rápido
    - Solo explora profundidades necesarias
    """
    return service.get_shortest_path(id_origen, id_destino, max_depth)


# ============================================================================
# RECOMENDACIONES (Friend-of-Friend)
# ============================================================================

@router.get(
    "/recommendations/{id_usuario}",
    response_model=RecommendationsResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Recomendaciones de usuarios (friend-of-friend)",
    description="Genera recomendaciones basadas en amigos de amigos."
)
def get_recommendations(
    id_usuario: int,
    limit: int = Query(10, ge=1, le=100, description="Número máximo de recomendaciones"),
    min_common: int = Query(1, ge=1, le=10, description="Mínimo de amigos en común"),
    service: GraphService = Depends(get_graph_service)
) -> RecommendationsResponseDTO:
    """
    Genera recomendaciones de usuarios usando algoritmo Friend-of-Friend.

    **Algoritmo:**
    1. Encuentra amigos directos del usuario
    2. Encuentra amigos de esos amigos (2do grado)
    3. Filtra usuarios ya conectados
    4. Ordena por número de amigos en común
    5. Calcula score de recomendación (0-1)

    **Casos de uso:**
    - Sistema de recomendaciones
    - Sugerencias de conexiones
    - Expansión de red social

    **Parámetros:**
    - **id_usuario**: Usuario para quien generar recomendaciones
    - **limit**: Número máximo de recomendaciones (default: 10, max: 100)
    - **min_common**: Mínimo de amigos en común requerido (default: 1)

    **Respuesta:**
    - Lista de usuarios recomendados
    - Número de amigos en común para cada recomendación
    - IDs de amigos en común
    - Score de recomendación (0-1)

    **Ejemplo:**
    ```
    GET /api/v1/graph/recommendations/1?limit=10&min_common=2
    ```
    """
    return service.get_recommendations(
        id_usuario=id_usuario,
        limit=limit,
        min_common_friends=min_common
    )


# ============================================================================
# SUBGRAFO EGO (para NetworkX/Sigma.js)
# ============================================================================

@router.get(
    "/ego/{id_usuario}",
    response_model=GraphResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Subgrafo ego (red personal)",
    description="Obtiene subgrafo centrado en un usuario para visualización con NetworkX/Sigma.js."
)
def get_ego_graph(
    id_usuario: int,
    depth: int = Query(1, ge=1, le=2, description="Grados de separación (1-2, recomendado: 1 para grafos grandes)"),
    max_nodes: int = Query(500, ge=10, le=2000, description="Máximo de nodos"),
    service: GraphService = Depends(get_graph_service)
) -> GraphResponseDTO:
    """
    Obtiene subgrafo ego centrado en un usuario (red personal).

    **Casos de uso:**
    - Visualización con Sigma.js
    - Análisis con NetworkX
    - Exploración de redes personales
    - Análisis de influencia local

    **Parámetros:**
    - **id_usuario**: Usuario central del subgrafo
    - **depth**: Grados de separación
        - 1 = Solo amigos directos (RECOMENDADO para grafos grandes)
        - 2 = Amigos + amigos de amigos (más lento)
    - **max_nodes**: Límite de nodos (para performance del frontend)

    **Respuesta:**
    - **nodes**: Lista de nodos del grafo
        - id, label, x, y (coordenadas)
        - size, color (visualización)
        - metadata (edad, hobby, etc.)
    - **edges**: Lista de aristas
        - source, target (IDs de nodos)
        - size, color
    - **stats**: Estadísticas del subgrafo
        - total_nodes, total_edges
        - density, avg_degree

    **Formato compatible con:**
    - Graphology (JavaScript)
    - Sigma.js (visualización)
    - NetworkX (Python)

    **Ejemplo:**
    ```
    GET /api/v1/graph/ego/1?depth=2&max_nodes=500
    ```

    **Uso en Frontend (React + Sigma.js):**
    ```javascript
    const response = await fetch('/api/v1/graph/ego/1?depth=2');
    const data = await response.json();

    const graph = new Graph();
    data.graph.nodes.forEach(node => graph.addNode(node.id, node));
    data.graph.edges.forEach(edge => graph.addEdge(edge.source, edge.target, edge));
    ```
    """
    return service.get_ego_graph(
        id_usuario=id_usuario,
        depth=depth,
        max_nodes=max_nodes
    )


# ============================================================================
# DETECCIÓN DE COMUNIDADES
# ============================================================================

@router.get(
    "/communities",
    response_model=CommunitiesResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Detección de comunidades",
    description="Detecta comunidades en el grafo basadas en hobbies compartidos."
)
def detect_communities(
    service: GraphService = Depends(get_graph_service)
) -> CommunitiesResponseDTO:
    """
    Detecta comunidades en el grafo social.

    **Algoritmo:** Clustering basado en hobbies compartidos
    - Agrupa usuarios por hobby
    - Analiza densidad de conexiones internas

    **Casos de uso:**
    - Análisis de comunidades
    - Segmentación de usuarios
    - Detección de grupos de interés
    - Marketing dirigido

    **Respuesta:**
    - Lista de comunidades detectadas
    - Miembros de cada comunidad
    - Tamaño de cada comunidad
    - Densidad interna (si disponible)
    - Algoritmo utilizado
    - Modularidad (si disponible)

    **Ejemplo:**
    ```
    GET /api/v1/graph/communities
    ```

    **Uso con NetworkX (Python):**
    ```python
    import requests
    import networkx as nx

    response = requests.get('http://localhost:8000/api/v1/graph/communities')
    communities = response.json()['communities']

    # Crear grafo coloreado por comunidad
    G = nx.Graph()
    for comm in communities:
        for member in comm['members']:
            G.add_node(member, community=comm['community_id'])
    ```
    """
    return service.detect_communities()


# ============================================================================
# TODAS LAS CONEXIONES DEL GRAFO
# ============================================================================

@router.get(
    "/connections",
    response_model=AllConexionesResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Obtener todas las conexiones del grafo",
    description="Retorna todos los usuarios con sus conexiones (array de IDs)."
)
def get_all_connections(
    service: GraphService = Depends(get_graph_service)
) -> AllConexionesResponseDTO:
    """
    Obtiene todas las conexiones del grafo.

    **Estructura de respuesta:**
    - Lista de usuarios con sus conexiones (array de IDs)
    - Solo incluye usuarios que tienen al menos una conexión
    - Los datos completos de usuarios se obtienen con GET /api/v1/usuarios

    **Casos de uso:**
    - Visualización de red completa en mapa
    - Análisis de conectividad del grafo
    - Detección de conexiones bidireccionales vs unidireccionales

    **Conexiones direccionales:**
    - Si usuario A tiene conexión con B → A tiene a B en su array
    - Si usuario B tiene conexión con A → B tiene a A en su array
    - Si ambos se tienen mutuamente → Conexión bidireccional

    **Ejemplo:**
    ```
    GET /api/v1/graph/connections
    ```

    **Respuesta:**
    ```json
    {
      "status_code": 200,
      "message": "Conexiones obtenidas exitosamente",
      "conexiones": [
        {"id_usuario": 1, "conexiones": [5, 10, 25]},
        {"id_usuario": 5, "conexiones": [1, 10, 15]}
      ],
      "stats": {
        "total_usuarios_con_conexiones": 850,
        "total_conexiones": 2500
      }
    }
    ```

    **Uso en Frontend:**
    ```typescript
    // Obtener usuarios y conexiones
    const usuarios = await fetch('/api/v1/usuarios').then(r => r.json());
    const conexiones = await fetch('/api/v1/graph/connections').then(r => r.json());

    // Detectar bidireccionalidad
    conexiones.conexiones.forEach(conn => {
      conn.conexiones.forEach(targetId => {
        const target = conexiones.conexiones.find(c => c.id_usuario === targetId);
        const isBidirectional = target?.conexiones.includes(conn.id_usuario);
        // Dibujar línea en mapa...
      });
    });
    ```

    **Performance:**
    - Query optimizada con Apache AGE
    - Solo retorna IDs (no datos completos)
    - Típicamente < 500ms para 1000 usuarios
    """
    return service.get_all_connections()
