from typing import List, Optional, Dict, Any
import json

from app.models.entities.usuario import Usuario
from db.database import DatabaseConnection
from app.core.config import settings


class UsuarioRepository:
    """
    Repositorio para entidad Usuario.
    Sigue el Principio de Responsabilidad Única - solo maneja acceso a datos.
    Implementa el Principio de Inversión de Dependencias - depende de abstracción DatabaseConnection.
    """

    def __init__(self, db: DatabaseConnection):
        self.db = db
        self.graph_name = settings.GRAPH_NAME

    def get_next_usuario_id(self) -> int:
        """
        Obtiene el siguiente ID de usuario disponible (max id_usuario + 1).

        Returns:
            Siguiente ID de usuario disponible
        """
        with self.db.get_cursor() as cursor:
            query = f"""
            SELECT * FROM cypher('{self.graph_name}', $$
                MATCH (u:Usuario)
                RETURN u.id_usuario AS id_usuario
                ORDER BY u.id_usuario DESC
                LIMIT 1
            $$) AS (id_usuario agtype);
            """

            cursor.execute(query)
            result = cursor.fetchone()

            if result and result['id_usuario']:
                # Parsear valor agtype a int
                max_id = int(str(result['id_usuario']).strip('"'))
                return max_id + 1
            else:
                # No existen usuarios, comenzar con ID 1
                return 1

    def create(self, usuario_data: Dict[str, Any], id_hobby: Optional[int] = None) -> Usuario:
        """
        Crea un nuevo nodo de usuario en la base de datos de grafos.
        Opcionalmente crea relación TIENE_HOBBY si se proporciona id_hobby.

        Args:
            usuario_data: Diccionario con propiedades del usuario (nombre, apellidos, edad, latitud, longitud)
            id_hobby: ID de hobby opcional para crear relación

        Returns:
            Entidad Usuario creada con ID generado
        """
        with self.db.get_cursor() as cursor:
            # Obtener siguiente ID de usuario
            next_id = self.get_next_usuario_id()

            # Construir query basado en si se necesita relación con hobby
            if id_hobby is not None:
                # Crear usuario y relación con hobby en la misma query
                query = f"""
                SELECT * FROM cypher('{self.graph_name}', $$
                    MATCH (h:Hobby {{id_hobby: {id_hobby}}})
                    CREATE (u:Usuario {{
                        id_usuario: {next_id},
                        nombre: '{usuario_data['nombre']}',
                        apellidos: '{usuario_data['apellidos']}',
                        edad: {usuario_data['edad']},
                        latitud: {usuario_data['latitud']},
                        longitud: {usuario_data['longitud']}
                    }})
                    CREATE (u)-[:TIENE_HOBBY]->(h)
                    RETURN u
                $$) AS (usuario agtype);
                """
            else:
                # Crear solo usuario
                query = f"""
                SELECT * FROM cypher('{self.graph_name}', $$
                    CREATE (u:Usuario {{
                        id_usuario: {next_id},
                        nombre: '{usuario_data['nombre']}',
                        apellidos: '{usuario_data['apellidos']}',
                        edad: {usuario_data['edad']},
                        latitud: {usuario_data['latitud']},
                        longitud: {usuario_data['longitud']}
                    }})
                    RETURN u
                $$) AS (usuario agtype);
                """

            cursor.execute(query)

            result = cursor.fetchone()
            if result:
                usuario_agtype = result['usuario']
                usuario_dict = self._parse_agtype_vertex(usuario_agtype)
                return Usuario(**usuario_dict)

            raise Exception("Error al crear usuario")

    def find_by_id(self, id_usuario: int) -> Optional[Dict[str, Any]]:
        """
        Busca un usuario por ID, incluyendo hobby, categoría y conexiones.

        Args:
            id_usuario: ID de usuario a buscar

        Returns:
            Diccionario con datos del usuario, hobby y conexiones si se encuentra, None en caso contrario
        """
        with self.db.get_cursor() as cursor:
            query = f"""
            SELECT * FROM cypher('{self.graph_name}', $$
                MATCH (u:Usuario)
                WHERE u.id_usuario = {id_usuario}
                OPTIONAL MATCH (u)-[:TIENE_HOBBY]->(h:Hobby)-[:PERTENECE_A]->(c:CategoriaHobby)
                OPTIONAL MATCH (u)-[:CONECTADO]->(con:Usuario)
                WITH u, h, c, collect(DISTINCT con.id_usuario) AS conexiones
                RETURN u, h, c, conexiones
            $$) AS (usuario agtype, hobby agtype, categoria agtype, conexiones agtype);
            """

            cursor.execute(query)
            result = cursor.fetchone()

            if result:
                # Parsear usuario
                usuario_dict = self._parse_agtype_vertex(result['usuario'])

                # Parsear hobby si existe
                if result['hobby']:
                    hobby_data = self._parse_agtype_vertex(result['hobby'])
                    categoria_data = self._parse_agtype_vertex(result['categoria'])

                    usuario_dict['hobby'] = {
                        'id_hobby': hobby_data.get('id_hobby'),
                        'nombre': hobby_data.get('nombre'),
                        'categoria': {
                            'id_categoria_hobby': categoria_data.get('id_categoria_hobby'),
                            'nombre': categoria_data.get('nombre')
                        }
                    }
                else:
                    usuario_dict['hobby'] = None

                # Parsear conexiones
                conexiones_agtype = result['conexiones']
                conexiones_list = self._parse_agtype_array(conexiones_agtype)
                usuario_dict['conexiones'] = conexiones_list

                return usuario_dict

            return None

    def find_all(self, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Obtiene todos los usuarios con paginación, incluyendo hobby, categoría y conexiones.

        Args:
            skip: Número de registros a saltar
            limit: Número máximo de registros a retornar

        Returns:
            Lista de diccionarios con datos de usuarios, hobbies y conexiones
        """
        with self.db.get_cursor() as cursor:
            query = f"""
            SELECT * FROM cypher('{self.graph_name}', $$
                MATCH (u:Usuario)
                OPTIONAL MATCH (u)-[:TIENE_HOBBY]->(h:Hobby)-[:PERTENECE_A]->(c:CategoriaHobby)
                OPTIONAL MATCH (u)-[:CONECTADO]->(con:Usuario)
                WITH u, h, c, collect(DISTINCT con.id_usuario) AS conexiones
                RETURN u, h, c, conexiones
                SKIP {skip}
                LIMIT {limit}
            $$) AS (usuario agtype, hobby agtype, categoria agtype, conexiones agtype);
            """

            cursor.execute(query)
            results = cursor.fetchall()

            usuarios = []
            for row in results:
                # Parsear usuario
                usuario_dict = self._parse_agtype_vertex(row['usuario'])

                # Parsear hobby si existe
                if row['hobby']:
                    hobby_data = self._parse_agtype_vertex(row['hobby'])
                    categoria_data = self._parse_agtype_vertex(row['categoria'])

                    usuario_dict['hobby'] = {
                        'id_hobby': hobby_data.get('id_hobby'),
                        'nombre': hobby_data.get('nombre'),
                        'categoria': {
                            'id_categoria_hobby': categoria_data.get('id_categoria_hobby'),
                            'nombre': categoria_data.get('nombre')
                        }
                    }
                else:
                    usuario_dict['hobby'] = None

                # Parsear conexiones
                conexiones_agtype = row['conexiones']
                conexiones_list = self._parse_agtype_array(conexiones_agtype)
                usuario_dict['conexiones'] = conexiones_list

                usuarios.append(usuario_dict)

            return usuarios

    def find_all_light(self, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Obtiene usuarios SIN conexiones (optimizado para listados masivos).

        OPTIMIZACIÓN: No usa collect(conexiones) → 50-100x más rápido que find_all()
        Ideal para GET /usuarios con muchos registros.

        Para obtener conexiones de un usuario específico, usar find_by_id().

        Args:
            skip: Número de registros a saltar
            limit: Número máximo de registros a retornar

        Returns:
            Lista de diccionarios con datos de usuarios y hobbies (sin conexiones)
        """
        with self.db.get_cursor() as cursor:
            query = f"""
            SELECT * FROM cypher('{self.graph_name}', $$
                MATCH (u:Usuario)
                OPTIONAL MATCH (u)-[:TIENE_HOBBY]->(h:Hobby)-[:PERTENECE_A]->(c:CategoriaHobby)
                RETURN u, h, c
                SKIP {skip}
                LIMIT {limit}
            $$) AS (usuario agtype, hobby agtype, categoria agtype);
            """

            cursor.execute(query)
            results = cursor.fetchall()

            usuarios = []
            for row in results:
                # Parsear usuario
                usuario_dict = self._parse_agtype_vertex(row['usuario'])

                # Parsear hobby si existe
                if row['hobby']:
                    hobby_data = self._parse_agtype_vertex(row['hobby'])
                    categoria_data = self._parse_agtype_vertex(row['categoria'])

                    usuario_dict['hobby'] = {
                        'id_hobby': hobby_data.get('id_hobby'),
                        'nombre': hobby_data.get('nombre'),
                        'categoria': {
                            'id_categoria_hobby': categoria_data.get('id_categoria_hobby'),
                            'nombre': categoria_data.get('nombre')
                        }
                    }
                else:
                    usuario_dict['hobby'] = None

                # ❌ NO incluir conexiones en listado masivo (performance)
                usuarios.append(usuario_dict)

            return usuarios

    def count_all(self) -> int:
        """
        Cuenta el total de usuarios en el grafo.

        Usado para metadata de paginación (calcular total de páginas).

        Returns:
            Número total de usuarios en la base de datos
        """
        with self.db.get_cursor() as cursor:
            query = f"""
            SELECT * FROM cypher('{self.graph_name}', $$
                MATCH (u:Usuario)
                RETURN count(u) AS total
            $$) AS (total agtype);
            """

            cursor.execute(query)
            result = cursor.fetchone()

            if result and result['total']:
                # Parsear valor agtype a int
                total_str = str(result['total']).strip('"')
                return int(total_str)

            return 0

    def update(self, id_usuario: int, usuario_data: Dict[str, Any]) -> Optional[Usuario]:
        """
        Actualiza completamente un usuario (operación PUT).
        Todos los campos deben ser provistos.

        Args:
            id_usuario: ID de usuario a actualizar
            usuario_data: Datos completos del usuario

        Returns:
            Updated Entidad Usuario si se encuentra, None en caso contrario
        """
        with self.db.get_cursor() as cursor:
            query = f"""
            SELECT * FROM cypher('{self.graph_name}', $$
                MATCH (u:Usuario)
                WHERE u.id_usuario = {id_usuario}
                SET u.nombre = '{usuario_data['nombre']}',
                    u.apellidos = '{usuario_data['apellidos']}',
                    u.edad = {usuario_data['edad']},
                    u.latitud = {usuario_data['latitud']},
                    u.longitud = {usuario_data['longitud']}
                RETURN u
            $$) AS (usuario agtype);
            """

            cursor.execute(query)

            result = cursor.fetchone()

            if result:
                usuario_agtype = result['usuario']
                usuario_dict = self._parse_agtype_vertex(usuario_agtype)
                return Usuario(**usuario_dict)

            return None

    def patch(self, id_usuario: int, usuario_data: Dict[str, Any]) -> Optional[Usuario]:
        """
        Actualiza parcialmente un usuario (operación PATCH).
        Solo los campos proporcionados son actualizados.

        Args:
            id_usuario: ID de usuario a actualizar
            usuario_data: Datos parciales del usuario (solo campos a actualizar)

        Returns:
            Updated Entidad Usuario si se encuentra, None en caso contrario
        """
        if not usuario_data:
            return self.find_by_id(id_usuario)

        # Construir cláusula SET dinámicamente solo para campos proporcionados
        set_clauses = []

        for key, value in usuario_data.items():
            if value is not None:
                if isinstance(value, str):
                    set_clauses.append(f"u.{key} = '{value}'")
                else:
                    set_clauses.append(f"u.{key} = {value}")

        if not set_clauses:
            return self.find_by_id(id_usuario)

        set_clause = ", ".join(set_clauses)

        with self.db.get_cursor() as cursor:
            query = f"""
            SELECT * FROM cypher('{self.graph_name}', $$
                MATCH (u:Usuario)
                WHERE u.id_usuario = {id_usuario}
                SET {set_clause}
                RETURN u
            $$) AS (usuario agtype);
            """

            cursor.execute(query)
            result = cursor.fetchone()

            if result:
                usuario_agtype = result['usuario']
                usuario_dict = self._parse_agtype_vertex(usuario_agtype)
                return Usuario(**usuario_dict)

            return None

    def delete(self, id_usuario: int) -> bool:
        """
        Elimina un usuario y todas sus relaciones (CASCADA).
        Esto incluye:
        - relaciones TIENE_HOBBY
        - relaciones CONECTADO (bidireccionales)

        Args:
            id_usuario: ID de usuario a eliminar

        Returns:
            True si fue eliminado, False si no se encontró
        """
        with self.db.get_cursor() as cursor:
            # Primero verificar si el usuario existe
            if not self.find_by_id(id_usuario):
                return False

            # Eliminar usuario y todas las relaciones (DETACH DELETE)
            query = f"""
            SELECT * FROM cypher('{self.graph_name}', $$
                MATCH (u:Usuario)
                WHERE u.id_usuario = {id_usuario}
                DETACH DELETE u
            $$) AS (result agtype);
            """

            cursor.execute(query)
            return True

    def exists_by_nombre_apellidos(self, nombre: str, apellidos: str, exclude_id: Optional[int] = None) -> bool:
        """
        Verifica si existe un usuario con el mismo nombre y apellidos.
        Espera valores normalizados (minúsculas) de la capa de servicio.

        Args:
            nombre: User's nombre (normalizado a minúsculas)
            apellidos: User's apellidos (normalizados a minúsculas)
            exclude_id: ID de usuario opcional a excluir de la búsqueda (para actualizaciones)

        Returns:
            True si el usuario existe, False en caso contrario
        """
        with self.db.get_cursor() as cursor:
            if exclude_id is not None:
                # Excluir usuario específico (para actualizaciones)
                query = f"""
                SELECT * FROM cypher('{self.graph_name}', $$
                    MATCH (u:Usuario)
                    WHERE u.id_usuario <> {exclude_id}
                      AND u.nombre = '{nombre}'
                      AND u.apellidos = '{apellidos}'
                    RETURN u
                    LIMIT 1
                $$) AS (usuario agtype);
                """
                cursor.execute(query)
            else:
                # Verificar cualquier usuario con mismo nombre+apellidos
                query = f"""
                SELECT * FROM cypher('{self.graph_name}', $$
                    MATCH (u:Usuario)
                    WHERE u.nombre = '{nombre}'
                      AND u.apellidos = '{apellidos}'
                    RETURN u
                    LIMIT 1
                $$) AS (usuario agtype);
                """
                cursor.execute(query)

            result = cursor.fetchone()
            return result is not None

    def hobby_exists(self, hobby_id: int) -> bool:
        """
        Verifica si existe un hobby.

        Args:
            hobby_id: ID de hobby a verificar

        Returns:
            True si el hobby existe, False en caso contrario
        """
        with self.db.get_cursor() as cursor:
            query = f"""
            SELECT * FROM cypher('{self.graph_name}', $$
                MATCH (h:Hobby {{id_hobby: {hobby_id}}})
                RETURN h
            $$) AS (hobby agtype);
            """

            cursor.execute(query)
            result = cursor.fetchone()
            return result is not None

    def get_usuario_with_hobby(self, id_usuario: int) -> Optional[Dict[str, Any]]:
        """
        Obtiene un usuario con su información de hobby y categoría.

        Args:
            id_usuario: ID de usuario

        Returns:
            Diccionario con datos del usuario e info de hobby, o None si no se encuentra
        """
        with self.db.get_cursor() as cursor:
            query = f"""
            SELECT * FROM cypher('{self.graph_name}', $$
                MATCH (u:Usuario)
                WHERE u.id_usuario = {id_usuario}
                OPTIONAL MATCH (u)-[:TIENE_HOBBY]->(h:Hobby)-[:PERTENECE_A]->(c:CategoriaHobby)
                RETURN u, h, c
            $$) AS (usuario agtype, hobby agtype, categoria agtype);
            """

            cursor.execute(query)
            result = cursor.fetchone()

            if not result:
                return None

            # Parsear usuario
            usuario_dict = self._parse_agtype_vertex(result['usuario'])

            # Parsear hobby si existe
            if result['hobby']:
                hobby_data = self._parse_agtype_vertex(result['hobby'])
                categoria_data = self._parse_agtype_vertex(result['categoria'])

                usuario_dict['hobby'] = {
                    'id_hobby': hobby_data.get('id_hobby'),
                    'nombre': hobby_data.get('nombre'),
                    'categoria': {
                        'id_categoria_hobby': categoria_data.get('id_categoria_hobby'),
                        'nombre': categoria_data.get('nombre')
                    }
                }
            else:
                usuario_dict['hobby'] = None

            return usuario_dict

    def create_hobby_relationship(self, id_usuario: int, hobby_id: int) -> bool:
        """
        Crea relación TIENE_HOBBY entre usuario y hobby.

        Args:
            id_usuario: ID de usuario
            hobby_id: ID de hobby

        Returns:
            True si se creó exitosamente
        """
        with self.db.get_cursor() as cursor:
            query = f"""
            SELECT * FROM cypher('{self.graph_name}', $$
                MATCH (u:Usuario), (h:Hobby {{id_hobby: {hobby_id}}})
                WHERE u.id_usuario = {id_usuario}
                CREATE (u)-[:TIENE_HOBBY]->(h)
            $$) AS (result agtype);
            """

            cursor.execute(query)
            return True

    def update_hobby_relationship(self, id_usuario: int, hobby_id: Optional[int]) -> bool:
        """
        Actualiza relación TIENE_HOBBY.
        Elimina relación existente y crea una nueva si se proporciona hobby_id.

        Args:
            id_usuario: ID de usuario
            hobby_id: Nuevo ID de hobby (None para remover hobby)

        Returns:
            True si se actualizó exitosamente
        """
        with self.db.get_cursor() as cursor:
            # Primero eliminar relación existente
            delete_query = f"""
            SELECT * FROM cypher('{self.graph_name}', $$
                MATCH (u:Usuario)-[r:TIENE_HOBBY]->(:Hobby)
                WHERE u.id_usuario = {id_usuario}
                DELETE r
            $$) AS (result agtype);
            """
            cursor.execute(delete_query)

            # Crear nueva relación si se proporciona hobby_id
            if hobby_id is not None:
                return self.create_hobby_relationship(id_usuario, hobby_id)

            return True

    def _parse_agtype_vertex(self, agtype_value) -> Dict[str, Any]:
        """
        Parsea vértice de Apache AGE a diccionario.

        Args:
            agtype_value: Valor de vértice AGE (puede ser dict, string, o memoryview)

        Returns:
            Diccionario con propiedades del vértice incluyendo id
        """
        # Manejar diferentes tipos de valores agtype
        if agtype_value is None:
            return {}

        # Si es bytes o memoryview, decodificarlo primero
        if isinstance(agtype_value, (bytes, memoryview)):
            agtype_value = bytes(agtype_value).decode('utf-8')

        # Parse AGType JSON string to dictionary
        if isinstance(agtype_value, str):
            # AGE puede agregar sufijos de tipo como "::vertex" or "::edge", remove them
            # También limpiar espacios en blanco extra o saltos de línea
            clean_value = agtype_value.strip()

            # Remover sufijo de tipo AGE si está presente
            if '::vertex' in clean_value:
                clean_value = clean_value.split('::vertex')[0]
            if '::edge' in clean_value:
                clean_value = clean_value.split('::edge')[0]

            # Parsear el JSON limpio
            try:
                vertex_data = json.loads(clean_value)
            except json.JSONDecodeError as e:
                # Si el parseo falla, intentar extraer solo el primer objeto JSON
                try:
                    # Encontrar el final del primer objeto JSON completo
                    decoder = json.JSONDecoder()
                    vertex_data, _ = decoder.raw_decode(clean_value)
                except json.JSONDecodeError:
                    raise ValueError(f"Error parsing AGE vertex JSON: {e}. Raw value: {agtype_value[:200]}")
        else:
            # Si ya es un dict, usarlo directamente
            vertex_data = agtype_value

        # Extraer propiedades del formato de vértice AGE
        # Formato AGE: {"id": ..., "label": "Usuario", "properties": {...}}
        if isinstance(vertex_data, dict):
            properties = vertex_data.get('properties', {})

            # Si properties está vacío, los datos del vértice podrían ser las propiedades
            if not properties and 'label' not in vertex_data:
                properties = vertex_data

            # Establecer ID basado en label si no está en properties
            if 'id_usuario' not in properties and vertex_data.get('label') == 'Usuario':
                properties['id_usuario'] = vertex_data.get('id')
            elif 'id_hobby' not in properties and vertex_data.get('label') == 'Hobby':
                properties['id_hobby'] = vertex_data.get('id')
            elif 'id_categoria_hobby' not in properties and vertex_data.get('label') == 'CategoriaHobby':
                properties['id_categoria_hobby'] = vertex_data.get('id')

            return properties
        else:
            raise ValueError(f"Unexpected AGE vertex format: {type(vertex_data)}")

    def _parse_agtype_array(self, agtype_value) -> List[int]:
        """
        Parsea array de Apache AGE a lista de Python.

        Args:
            agtype_value: Valor de array AGE (puede ser list, string, o memoryview)

        Returns:
            Lista de enteros (IDs de usuarios conectados)
        """
        # Manejar valores None o vacíos
        if agtype_value is None:
            return []

        # Si es bytes o memoryview, decodificarlo primero
        if isinstance(agtype_value, (bytes, memoryview)):
            agtype_value = bytes(agtype_value).decode('utf-8')

        # Si ya es una lista de Python, procesarla directamente
        if isinstance(agtype_value, list):
            result = []
            for item in agtype_value:
                if item is not None:
                    # Convertir a int, manejando posibles strings
                    try:
                        result.append(int(item))
                    except (ValueError, TypeError):
                        continue
            return result

        # Si es string, parsearlo como JSON
        if isinstance(agtype_value, str):
            clean_value = agtype_value.strip()

            # Si está vacío o es solo "[]", retornar lista vacía
            if not clean_value or clean_value == '[]':
                return []

            # Remover sufijo de tipo AGE si está presente (ej: "[1, 2, 3]::_agtype")
            if '::' in clean_value:
                clean_value = clean_value.split('::')[0].strip()

            try:
                array_data = json.loads(clean_value)

                # Verificar que sea una lista
                if not isinstance(array_data, list):
                    return []

                # Convertir todos los elementos a int, filtrando None
                result = []
                for item in array_data:
                    if item is not None:
                        try:
                            result.append(int(item))
                        except (ValueError, TypeError):
                            continue
                return result

            except json.JSONDecodeError:
                return []

        # Si no es ninguno de los tipos esperados, retornar lista vacía
        return []

    def conexion_exists(self, id_usuario_origen: int, id_usuario_destino: int) -> bool:
        """
        Verifica si ya existe una conexión entre dos usuarios.

        Args:
            id_usuario_origen: ID del usuario origen
            id_usuario_destino: ID del usuario destino

        Returns:
            True si la conexión existe, False en caso contrario
        """
        with self.db.get_cursor() as cursor:
            query = f"""
            SELECT * FROM cypher('{self.graph_name}', $$
                MATCH (u1:Usuario {{id_usuario: {id_usuario_origen}}})-[:CONECTADO]->(u2:Usuario {{id_usuario: {id_usuario_destino}}})
                RETURN u1
            $$) AS (usuario agtype);
            """

            cursor.execute(query)
            result = cursor.fetchone()

            return result is not None

    def create_conexion(self, id_usuario_origen: int, id_usuario_destino: int) -> bool:
        """
        Crea una conexión direccional entre dos usuarios.

        Args:
            id_usuario_origen: ID del usuario que origina la conexión
            id_usuario_destino: ID del usuario destino de la conexión

        Returns:
            True si se creó exitosamente

        Raises:
            Exception: Si ocurre un error al crear la conexión
        """
        with self.db.get_cursor() as cursor:
            query = f"""
            SELECT * FROM cypher('{self.graph_name}', $$
                MATCH (u1:Usuario {{id_usuario: {id_usuario_origen}}}), (u2:Usuario {{id_usuario: {id_usuario_destino}}})
                CREATE (u1)-[:CONECTADO]->(u2)
                RETURN u1, u2
            $$) AS (origen agtype, destino agtype);
            """

            cursor.execute(query)
            result = cursor.fetchone()

            if result:
                return True

            raise Exception("Error al crear conexión")

    def get_usuario_nombre_completo(self, id_usuario: int) -> Optional[str]:
        """
        Obtiene el nombre completo (nombre + apellidos) de un usuario.

        Args:
            id_usuario: ID del usuario

        Returns:
            Nombre completo del usuario o None si no existe
        """
        with self.db.get_cursor() as cursor:
            query = f"""
            SELECT * FROM cypher('{self.graph_name}', $$
                MATCH (u:Usuario {{id_usuario: {id_usuario}}})
                RETURN u.nombre, u.apellidos
            $$) AS (nombre agtype, apellidos agtype);
            """

            cursor.execute(query)
            result = cursor.fetchone()

            if result:
                # Parsear valores agtype (pueden venir como strings con comillas)
                nombre = str(result['nombre']).strip('"')
                apellidos = str(result['apellidos']).strip('"')
                return f"{nombre} {apellidos}"

            return None

    def delete_conexion(self, id_usuario_origen: int, id_usuario_destino: int) -> bool:
        """
        Elimina una conexión direccional entre dos usuarios.

        Args:
            id_usuario_origen: ID del usuario origen
            id_usuario_destino: ID del usuario destino

        Returns:
            True si se eliminó exitosamente, False si no existía la conexión

        Raises:
            Exception: Si ocurre un error al eliminar
        """
        with self.db.get_cursor() as cursor:
            # Verificar si la conexión existe
            if not self.conexion_exists(id_usuario_origen, id_usuario_destino):
                return False

            # Eliminar la conexión
            query = f"""
            SELECT * FROM cypher('{self.graph_name}', $$
                MATCH (u1:Usuario {{id_usuario: {id_usuario_origen}}})-[r:CONECTADO]->(u2:Usuario {{id_usuario: {id_usuario_destino}}})
                DELETE r
                RETURN u1
            $$) AS (usuario agtype);
            """

            cursor.execute(query)
            result = cursor.fetchone()

            if result:
                return True

            raise Exception("Error al eliminar conexión")

    def get_usuario_conexiones(self, id_usuario: int) -> List[Dict[str, Any]]:
        """
        Obtiene todos los usuarios conectados a un usuario específico.

        Retorna los datos completos de cada usuario conectado (sin el campo 'conexiones'
        para evitar recursión).

        Args:
            id_usuario: ID del usuario del cual obtener las conexiones

        Returns:
            Lista de diccionarios con datos de usuarios conectados

        Raises:
            Exception: Si el usuario no existe
        """
        with self.db.get_cursor() as cursor:
            # Primero verificar que el usuario existe
            usuario_existe = self.find_by_id(id_usuario)
            if not usuario_existe:
                raise Exception(f"Usuario con ID {id_usuario} no encontrado")

            # Obtener todos los usuarios conectados con sus datos completos
            query = f"""
            SELECT * FROM cypher('{self.graph_name}', $$
                MATCH (u:Usuario {{id_usuario: {id_usuario}}})-[:CONECTADO]->(c:Usuario)
                OPTIONAL MATCH (c)-[:TIENE_HOBBY]->(h:Hobby)-[:PERTENECE_A]->(cat:CategoriaHobby)
                RETURN c, h, cat
            $$) AS (usuario agtype, hobby agtype, categoria agtype);
            """

            cursor.execute(query)
            results = cursor.fetchall()

            conexiones = []
            for row in results:
                # Parsear usuario conectado
                usuario_dict = self._parse_agtype_vertex(row['usuario'])

                # Parsear hobby si existe
                if row['hobby']:
                    hobby_data = self._parse_agtype_vertex(row['hobby'])
                    categoria_data = self._parse_agtype_vertex(row['categoria'])

                    usuario_dict['hobby'] = {
                        'id_hobby': hobby_data.get('id_hobby'),
                        'nombre': hobby_data.get('nombre'),
                        'categoria': {
                            'id_categoria_hobby': categoria_data.get('id_categoria_hobby'),
                            'nombre': categoria_data.get('nombre')
                        }
                    }
                else:
                    usuario_dict['hobby'] = None

                conexiones.append(usuario_dict)

            return conexiones
