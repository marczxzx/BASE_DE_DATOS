from typing import List, Optional, Dict, Any
import json

from db.database import DatabaseConnection
from app.core.config import settings


class GraphRepository:
    """
    Repositorio para análisis de grafos y consultas complejas.
    Maneja operaciones de NetworkX como caminos cortos, comunidades, etc.
    """

    def __init__(self, db: DatabaseConnection):
        self.db = db
        self.graph_name = settings.GRAPH_NAME

    # ============================================================================
    # CAMINO MÁS CORTO (Shortest Path)
    # ============================================================================

    def find_shortest_path(self, id_usuario_origen: int, id_usuario_destino: int, max_depth: int = 3) -> Optional[List[Dict[str, Any]]]:
        """
        Encuentra el camino más corto entre dos usuarios usando BFS ITERATIVO.

        ALGORITMO: Breadth-First Search (BFS) iterativo
        - Busca primero caminos de longitud 1
        - Luego longitud 2, luego 3, etc.
        - Se detiene en cuanto encuentra UN camino (que será el más corto)

        OPTIMIZADO para grafos grandes:
        - 5-10x más rápido que buscar todos los caminos y ordenar
        - No explora profundidades innecesarias
        - Usa queries incrementales por profundidad

        Args:
            id_usuario_origen: ID del usuario origen
            id_usuario_destino: ID del usuario destino
            max_depth: Profundidad máxima de búsqueda (default: 3)

        Returns:
            Lista de nodos en el camino (None si no existe camino)
        """
        with self.db.get_cursor() as cursor:
            # BFS ITERATIVO: Buscar profundidad 1, luego 2, luego 3, etc.
            # En cuanto encontramos un camino, es el más corto (por definición de BFS)
            for depth in range(1, max_depth + 1):
                query = f"""
                SELECT * FROM cypher('{self.graph_name}', $$
                    MATCH path = (origen:Usuario {{id_usuario: {id_usuario_origen}}})-[:CONECTADO*{depth}]-(destino:Usuario {{id_usuario: {id_usuario_destino}}})
                    RETURN path
                    LIMIT 1
                $$) AS (path agtype);
                """

                cursor.execute(query)
                result = cursor.fetchone()

                if result and result['path']:
                    # ¡Encontramos un camino! Como BFS explora por niveles, este ES el más corto
                    # Ahora extraemos los nodos del camino
                    nodes_query = f"""
                    SELECT * FROM cypher('{self.graph_name}', $$
                        MATCH path = (origen:Usuario {{id_usuario: {id_usuario_origen}}})-[:CONECTADO*{depth}]-(destino:Usuario {{id_usuario: {id_usuario_destino}}})
                        WITH path
                        LIMIT 1
                        UNWIND nodes(path) AS node
                        RETURN node.id_usuario, node.nombre, node.apellidos
                    $$) AS (id_usuario agtype, nombre agtype, apellidos agtype);
                    """

                    cursor.execute(nodes_query)
                    node_results = cursor.fetchall()

                    path = []
                    for row in node_results:
                        id_usuario = int(str(row['id_usuario']).strip('"'))
                        nombre = str(row['nombre']).strip('"')
                        apellidos = str(row['apellidos']).strip('"')

                        path.append({
                            'id_usuario': id_usuario,
                            'nombre_completo': f"{nombre} {apellidos}"
                        })

                    return path if path else None

            # No se encontró camino dentro de max_depth
            return None

    # ============================================================================
    # RECOMENDACIONES (Friend-of-Friend)
    # ============================================================================

    def get_friend_of_friend_recommendations(
        self,
        id_usuario: int,
        limit: int = 10,
        min_common_friends: int = 1
    ) -> List[Dict[str, Any]]:
        """
        Obtiene recomendaciones de usuarios basadas en friend-of-friend.
        Encuentra usuarios que NO son amigos directos pero tienen amigos en común.

        Args:
            id_usuario: ID del usuario para quien generar recomendaciones
            limit: Número máximo de recomendaciones
            min_common_friends: Mínimo de amigos en común requerido

        Returns:
            Lista de usuarios recomendados con score
        """
        with self.db.get_cursor() as cursor:
            # Query simplificada compatible con Apache AGE
            query = f"""
            SELECT * FROM cypher('{self.graph_name}', $$
                MATCH (user:Usuario {{id_usuario: {id_usuario}}})-[:CONECTADO]->(friend:Usuario)-[:CONECTADO]->(fof:Usuario)
                WHERE user.id_usuario <> fof.id_usuario
                  AND NOT EXISTS((user)-[:CONECTADO]->(fof))
                WITH fof, collect(DISTINCT friend.id_usuario) AS common_friends
                WHERE size(common_friends) >= {min_common_friends}
                RETURN fof.id_usuario, fof.nombre, fof.apellidos, common_friends
                ORDER BY size(common_friends) DESC
                LIMIT {limit}
            $$) AS (id_usuario agtype, nombre agtype, apellidos agtype, common_friends agtype);
            """

            cursor.execute(query)
            results = cursor.fetchall()

            if not results:
                return []

            recommendations = []
            max_common = 1  # Para normalizar score

            # Procesar resultados
            temp_results = []
            for row in results:
                id_usuario_rec = int(str(row['id_usuario']).strip('"'))
                nombre = str(row['nombre']).strip('"')
                apellidos = str(row['apellidos']).strip('"')

                # Parsear array de amigos comunes
                common_friends_raw = str(row['common_friends'])
                common_friends = self._parse_agtype_array(common_friends_raw)
                common_count = len(common_friends)

                if common_count > max_common:
                    max_common = common_count

                temp_results.append({
                    'id_usuario': id_usuario_rec,
                    'nombre': nombre,
                    'apellidos': apellidos,
                    'common_friends': common_friends,
                    'common_count': common_count
                })

            # Construir respuesta final con scores
            for item in temp_results:
                score = round(item['common_count'] / max_common, 2)

                recommendations.append({
                    'id_usuario': item['id_usuario'],
                    'nombre_completo': f"{item['nombre']} {item['apellidos']}",
                    'common_friends': item['common_count'],
                    'common_friends_ids': item['common_friends'],
                    'score': score
                })

            return recommendations

    # ============================================================================
    # SUBGRAFO EGO (para NetworkX/Sigma.js)
    # ============================================================================

    def get_ego_subgraph(
        self,
        id_usuario: int,
        depth: int = 2,
        max_nodes: int = 500
    ) -> Dict[str, Any]:
        """
        Obtiene subgrafo ego centrado en un usuario (red personal).

        Args:
            id_usuario: ID del usuario central
            depth: Grados de separación (1=amigos directos, 2=amigos de amigos)
            max_nodes: Máximo de nodos a retornar

        Returns:
            {"nodes": [...], "edges": [...]}
        """
        with self.db.get_cursor() as cursor:
            # Obtener nodos del subgrafo - query simplificada para Apache AGE
            nodes_query = f"""
            SELECT * FROM cypher('{self.graph_name}', $$
                MATCH (center:Usuario {{id_usuario: {id_usuario}}})-[:CONECTADO*1..{depth}]-(u:Usuario)
                OPTIONAL MATCH (u)-[:TIENE_HOBBY]->(h:Hobby)
                RETURN DISTINCT u.id_usuario, u.nombre, u.apellidos, u.edad, u.latitud, u.longitud, h.nombre
                LIMIT {max_nodes}
            $$) AS (id_usuario agtype, nombre agtype, apellidos agtype, edad agtype,
                    latitud agtype, longitud agtype, hobby agtype);
            """

            cursor.execute(nodes_query)
            node_results = cursor.fetchall()

            # Parsear nodos
            nodes = []
            node_ids = set()

            for row in node_results:
                id_usuario_node = int(str(row['id_usuario']).strip('"'))
                nombre = str(row['nombre']).strip('"')
                apellidos = str(row['apellidos']).strip('"')
                edad = int(str(row['edad']).strip('"'))
                latitud = float(str(row['latitud']).strip('"'))
                longitud = float(str(row['longitud']).strip('"'))
                hobby = str(row['hobby']).strip('"') if row['hobby'] else None

                node_ids.add(id_usuario_node)

                nodes.append({
                    'id': str(id_usuario_node),
                    'label': f"{nombre} {apellidos}",
                    'x': latitud * 100,  # Escalar coordenadas para visualización
                    'y': longitud * 100,
                    'size': 10,
                    'color': self._get_hobby_color(hobby),
                    'metadata': {
                        'edad': edad,
                        'hobby': hobby,
                        'latitud': latitud,
                        'longitud': longitud
                    }
                })

            # Obtener aristas entre los nodos del subgrafo
            if node_ids:
                node_ids_str = ','.join(map(str, node_ids))
                edges_query = f"""
                SELECT * FROM cypher('{self.graph_name}', $$
                    MATCH (n1:Usuario)-[:CONECTADO]->(n2:Usuario)
                    WHERE n1.id_usuario IN [{node_ids_str}]
                      AND n2.id_usuario IN [{node_ids_str}]
                    RETURN DISTINCT n1.id_usuario AS source, n2.id_usuario AS target
                $$) AS (source agtype, target agtype);
                """

                cursor.execute(edges_query)
                edge_results = cursor.fetchall()

                edges = []
                for i, row in enumerate(edge_results):
                    source = str(int(str(row['source']).strip('"')))
                    target = str(int(str(row['target']).strip('"')))

                    edges.append({
                        'id': f"e{i}",
                        'source': source,
                        'target': target,
                        'size': 1,
                        'color': '#cccccc'
                    })
            else:
                edges = []

            return {
                'nodes': nodes,
                'edges': edges
            }

    # ============================================================================
    # DETECCIÓN DE COMUNIDADES
    # ============================================================================

    def detect_communities_by_hobby(self) -> List[Dict[str, Any]]:
        """
        Detecta comunidades basadas en hobbies compartidos.
        Agrupa usuarios por hobby y analiza sus conexiones.

        Returns:
            Lista de comunidades con sus miembros
        """
        with self.db.get_cursor() as cursor:
            # Query simplificada compatible con Apache AGE
            query = f"""
            SELECT * FROM cypher('{self.graph_name}', $$
                MATCH (u:Usuario)-[:TIENE_HOBBY]->(h:Hobby)
                WITH h.id_hobby AS id_hobby, h.nombre AS nombre, collect(DISTINCT u.id_usuario) AS members
                WHERE size(members) > 1
                RETURN id_hobby, nombre, members
                ORDER BY size(members) DESC
            $$) AS (community_id agtype, hobby_name agtype, members agtype);
            """

            cursor.execute(query)
            results = cursor.fetchall()

            communities = []
            for row in results:
                community_id = int(str(row['community_id']).strip('"'))
                hobby_name = str(row['hobby_name']).strip('"')

                # Parsear array de miembros
                members_raw = str(row['members'])
                members = self._parse_agtype_array(members_raw)

                communities.append({
                    'community_id': community_id,
                    'hobby_name': hobby_name,
                    'members': members,
                    'size': len(members),
                    'density': None  # Se puede calcular después si es necesario
                })

            return communities

    # ============================================================================
    # HELPERS
    # ============================================================================

    def _parse_agtype_array(self, agtype_value) -> List[int]:
        """
        Parsea array de Apache AGE a lista de Python.

        Args:
            agtype_value: Valor de array AGE

        Returns:
            Lista de enteros
        """
        if agtype_value is None:
            return []

        # Si es bytes o memoryview, decodificarlo
        if isinstance(agtype_value, (bytes, memoryview)):
            agtype_value = bytes(agtype_value).decode('utf-8')

        # Si ya es lista, procesarla
        if isinstance(agtype_value, list):
            return [int(item) for item in agtype_value if item is not None]

        # Si es string, parsearlo
        if isinstance(agtype_value, str):
            clean_value = agtype_value.strip()

            if not clean_value or clean_value == '[]':
                return []

            # Remover sufijo de tipo AGE
            if '::' in clean_value:
                clean_value = clean_value.split('::')[0].strip()

            try:
                array_data = json.loads(clean_value)
                if isinstance(array_data, list):
                    return [int(item) for item in array_data if item is not None]
            except json.JSONDecodeError:
                return []

        return []

    def _get_hobby_color(self, hobby_name: Optional[str]) -> str:
        """
        Mapeo de hobbies a colores para visualización.

        Args:
            hobby_name: Nombre del hobby

        Returns:
            Color hexadecimal
        """
        if not hobby_name:
            return "#95a5a6"  # Gris por defecto

        # Mapeo de hobbies a colores (puedes expandir esto)
        color_map = {
            # Deportes
            "futbol": "#ff6b6b",
            "basquetbol": "#ee5a6f",
            "tenis": "#f06595",

            # Arte y cultura
            "pintura": "#4ecdc4",
            "escultura": "#45b7d1",
            "fotografia": "#96ceb4",

            # Música
            "guitarra": "#feca57",
            "piano": "#ff9ff3",

            # Otros
            "lectura": "#54a0ff",
            "cocina": "#48dbfb",
        }

        # Buscar color (normalizar a minúsculas)
        hobby_lower = hobby_name.lower()
        return color_map.get(hobby_lower, "#95a5a6")

    def get_all_connections(self) -> List[Dict[str, Any]]:
        """
        Obtiene todas las conexiones del grafo.

        Retorna una lista con cada usuario y sus conexiones (array de IDs).

        Returns:
            Lista de diccionarios con formato:
            [
                {"id_usuario": 1, "conexiones": [5, 10, 25]},
                {"id_usuario": 5, "conexiones": [1, 10, 15]},
                ...
            ]
        """
        query = f"""
        SELECT * FROM cypher('{self.graph_name}', $$
            MATCH (u:Usuario)
            OPTIONAL MATCH (u)-[:CONECTADO]->(c:Usuario)
            RETURN
                u.id_usuario AS id_usuario,
                collect(DISTINCT c.id_usuario) AS conexiones
            ORDER BY u.id_usuario
        $$) AS (id_usuario agtype, conexiones agtype)
        """

        with self.db.get_cursor() as cursor:
            cursor.execute(query)
            results = cursor.fetchall()

            conexiones_list = []
            for row in results:
                # Acceder a los campos por nombre (son diccionarios)
                id_usuario_raw = row['id_usuario']
                conexiones_raw = row['conexiones']

                # Parsear id_usuario
                id_usuario = self._parse_agtype(id_usuario_raw)

                # Parsear array de conexiones
                conexiones = self._parse_agtype_array(conexiones_raw)

                # Filtrar nulls y el propio usuario
                conexiones = [c for c in conexiones if c is not None and c != id_usuario]

                # Solo incluir usuarios que tienen al menos una conexión
                if conexiones:
                    conexiones_list.append({
                        "id_usuario": id_usuario,
                        "conexiones": conexiones
                    })

            return conexiones_list

    def _parse_agtype(self, agtype_value) -> Any:
        """
        Parsea un valor agtype a tipo Python nativo.

        Args:
            agtype_value: Valor en formato agtype

        Returns:
            Valor parseado (int, str, float, etc.)
        """
        if agtype_value is None:
            return None

        agtype_str = str(agtype_value)

        # Intentar parsear como JSON
        try:
            return json.loads(agtype_str)
        except (json.JSONDecodeError, ValueError):
            # Si falla, retornar el string sin modificar
            return agtype_str
