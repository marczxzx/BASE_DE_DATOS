from fastapi import HTTPException, status

from app.models.dto.graph_dto import (
    ShortestPathResponseDTO,
    PathNodeDTO,
    RecommendationsResponseDTO,
    RecommendationDTO,
    GraphResponseDTO,
    GraphDataDTO,
    GraphNodeDTO,
    GraphEdgeDTO,
    GraphStatsDTO,
    CommunitiesResponseDTO,
    CommunityDTO,
    AllConexionesResponseDTO,
    UsuarioConexionesDTO,
    ConexionesStatsDTO
)
from app.repositories.graph_repository import GraphRepository
from app.repositories.usuario_repository import UsuarioRepository


class GraphService:
    """
    Servicio para análisis de grafos y operaciones complejas.
    Implementa requisitos funcionales como shortest path, friend-of-friend, comunidades, etc.
    """

    def __init__(self, graph_repository: GraphRepository, usuario_repository: UsuarioRepository):
        self.graph_repository = graph_repository
        self.usuario_repository = usuario_repository

    # ============================================================================
    # CAMINO MÁS CORTO (Shortest Path)
    # ============================================================================

    def get_shortest_path(self, id_usuario_origen: int, id_usuario_destino: int, max_depth: int = 3) -> ShortestPathResponseDTO:
        """
        Encuentra el camino más corto entre dos usuarios.

        Args:
            id_usuario_origen: ID del usuario origen
            id_usuario_destino: ID del usuario destino

        Returns:
            ShortestPathResponseDTO con el camino encontrado

        Raises:
            HTTPException: Si alguno de los usuarios no existe
        """
        # Validar que ambos usuarios existan
        usuario_origen = self.usuario_repository.find_by_id(id_usuario_origen)
        if not usuario_origen:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Usuario origen con ID {id_usuario_origen} no encontrado"
            )

        usuario_destino = self.usuario_repository.find_by_id(id_usuario_destino)
        if not usuario_destino:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Usuario destino con ID {id_usuario_destino} no encontrado"
            )

        # Buscar camino más corto con límite de profundidad
        path = self.graph_repository.find_shortest_path(id_usuario_origen, id_usuario_destino, max_depth)

        if path is None or len(path) == 0:
            return ShortestPathResponseDTO(
                status_code=status.HTTP_200_OK,
                message="No existe un camino entre los usuarios",
                path=[],
                length=0,
                exists=False
            )

        # Convertir a DTOs
        path_dtos = [PathNodeDTO(**node) for node in path]

        return ShortestPathResponseDTO(
            status_code=status.HTTP_200_OK,
            message=f"Camino más corto encontrado ({len(path) - 1} saltos)",
            path=path_dtos,
            length=len(path) - 1,  # Longitud es número de aristas (nodos - 1)
            exists=True
        )

    # ============================================================================
    # RECOMENDACIONES (Friend-of-Friend)
    # ============================================================================

    def get_recommendations(
        self,
        id_usuario: int,
        limit: int = 10,
        min_common_friends: int = 1
    ) -> RecommendationsResponseDTO:
        """
        Genera recomendaciones de usuarios basadas en friend-of-friend.

        Args:
            id_usuario: ID del usuario para quien generar recomendaciones
            limit: Número máximo de recomendaciones
            min_common_friends: Mínimo de amigos en común

        Returns:
            RecommendationsResponseDTO con lista de usuarios recomendados

        Raises:
            HTTPException: Si el usuario no existe
        """
        # Validar que el usuario exista
        usuario = self.usuario_repository.find_by_id(id_usuario)
        if not usuario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Usuario con ID {id_usuario} no encontrado"
            )

        # Obtener recomendaciones
        recommendations = self.graph_repository.get_friend_of_friend_recommendations(
            id_usuario=id_usuario,
            limit=limit,
            min_common_friends=min_common_friends
        )

        # Convertir a DTOs
        recommendation_dtos = [RecommendationDTO(**rec) for rec in recommendations]

        return RecommendationsResponseDTO(
            status_code=status.HTTP_200_OK,
            message=f"Encontradas {len(recommendations)} recomendaciones",
            user_id=id_usuario,
            recommendations=recommendation_dtos,
            total=len(recommendations)
        )

    # ============================================================================
    # SUBGRAFO EGO (para NetworkX/Sigma.js)
    # ============================================================================

    def get_ego_graph(
        self,
        id_usuario: int,
        depth: int = 2,
        max_nodes: int = 500
    ) -> GraphResponseDTO:
        """
        Obtiene subgrafo ego centrado en un usuario (red personal).

        Args:
            id_usuario: ID del usuario central
            depth: Grados de separación (1-3)
            max_nodes: Máximo de nodos a retornar

        Returns:
            GraphResponseDTO con nodos y aristas del subgrafo

        Raises:
            HTTPException: Si el usuario no existe o parámetros inválidos
        """
        # Validar usuario
        usuario = self.usuario_repository.find_by_id(id_usuario)
        if not usuario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Usuario con ID {id_usuario} no encontrado"
            )

        # Validar parámetros
        if depth < 1 or depth > 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El parámetro 'depth' debe estar entre 1 y 3"
            )

        if max_nodes < 10 or max_nodes > 2000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El parámetro 'max_nodes' debe estar entre 10 y 2000"
            )

        # Obtener subgrafo
        graph_data = self.graph_repository.get_ego_subgraph(
            id_usuario=id_usuario,
            depth=depth,
            max_nodes=max_nodes
        )

        # Convertir a DTOs
        nodes = [GraphNodeDTO(**node) for node in graph_data['nodes']]
        edges = [GraphEdgeDTO(**edge) for edge in graph_data['edges']]

        # Calcular estadísticas
        total_nodes = len(nodes)
        total_edges = len(edges)
        avg_degree = (2 * total_edges / total_nodes) if total_nodes > 0 else 0
        max_edges = (total_nodes * (total_nodes - 1)) / 2
        density = (total_edges / max_edges) if max_edges > 0 else 0

        stats = GraphStatsDTO(
            total_nodes=total_nodes,
            total_edges=total_edges,
            density=round(density, 4),
            avg_degree=round(avg_degree, 2)
        )

        return GraphResponseDTO(
            status_code=status.HTTP_200_OK,
            message=f"Subgrafo ego obtenido ({total_nodes} nodos, {total_edges} aristas)",
            graph=GraphDataDTO(nodes=nodes, edges=edges),
            stats=stats
        )

    # ============================================================================
    # DETECCIÓN DE COMUNIDADES
    # ============================================================================

    def detect_communities(self) -> CommunitiesResponseDTO:
        """
        Detecta comunidades en el grafo basadas en hobbies compartidos.

        Returns:
            CommunitiesResponseDTO con comunidades detectadas
        """
        # Detectar comunidades
        communities = self.graph_repository.detect_communities_by_hobby()

        # Convertir a DTOs
        community_dtos = []
        for i, comm in enumerate(communities):
            community_dtos.append(CommunityDTO(
                community_id=comm['community_id'],
                members=comm['members'],
                size=comm['size'],
                density=comm.get('density')
            ))

        return CommunitiesResponseDTO(
            status_code=status.HTTP_200_OK,
            message=f"Detectadas {len(communities)} comunidades",
            communities=community_dtos,
            total_communities=len(communities),
            algorithm="Hobby-based clustering",
            modularity=None  # Se puede calcular si se necesita
        )

    # ============================================================================
    # TODAS LAS CONEXIONES DEL GRAFO
    # ============================================================================

    def get_all_connections(self) -> AllConexionesResponseDTO:
        """
        Obtiene todas las conexiones del grafo.

        Retorna cada usuario con su lista de conexiones (IDs).
        Solo incluye usuarios que tienen al menos una conexión.

        Returns:
            AllConexionesResponseDTO con lista de conexiones y estadísticas
        """
        # Obtener conexiones desde el repository
        conexiones = self.graph_repository.get_all_connections()

        # Convertir a DTOs
        conexiones_dtos = [UsuarioConexionesDTO(**conn) for conn in conexiones]

        # Calcular estadísticas
        total_usuarios_con_conexiones = len(conexiones)
        total_conexiones = sum(len(conn['conexiones']) for conn in conexiones)

        stats = ConexionesStatsDTO(
            total_usuarios_con_conexiones=total_usuarios_con_conexiones,
            total_conexiones=total_conexiones
        )

        return AllConexionesResponseDTO(
            status_code=status.HTTP_200_OK,
            message="Conexiones obtenidas exitosamente",
            conexiones=conexiones_dtos,
            stats=stats
        )
