from typing import List, Dict, Any
import json
from db.database import DatabaseConnection


class HobbyRepository:
    """
    Repositorio para gestionar operaciones de lectura de hobbies en Apache AGE.
    """

    def __init__(self, db: DatabaseConnection):
        self.db = db

    def get_all_hobbies(self) -> List[Dict[str, Any]]:
        """
        Obtiene todos los hobbies con sus categorías desde el grafo.

        Returns:
            Lista de hobbies con formato:
            [
                {
                    "id_hobby": int,
                    "nombre": str,
                    "categoria": {
                        "id_categoria_hobby": int,
                        "nombre": str
                    }
                },
                ...
            ]
        """
        with self.db.get_cursor() as cursor:
            query = """
            SELECT * FROM cypher('red_usuarios', $$
                MATCH (h:Hobby)-[:PERTENECE_A]->(c:CategoriaHobby)
                RETURN h.id_hobby AS id_hobby,
                       h.nombre AS nombre,
                       c.id_categoria_hobby AS id_categoria,
                       c.nombre AS categoria_nombre
                ORDER BY h.id_hobby
            $$) AS (
                id_hobby agtype,
                nombre agtype,
                id_categoria agtype,
                categoria_nombre agtype
            );
            """

            cursor.execute(query)
            result = cursor.fetchall()

            hobbies = []
            for row in result:
                # Parsear valores agtype que vienen como strings JSON
                hobby = {
                    "id_hobby": json.loads(str(row['id_hobby'])) if row['id_hobby'] else None,
                    "nombre": json.loads(str(row['nombre'])) if row['nombre'] else "",
                    "categoria": {
                        "id_categoria_hobby": json.loads(str(row['id_categoria'])) if row['id_categoria'] else None,
                        "nombre": json.loads(str(row['categoria_nombre'])) if row['categoria_nombre'] else ""
                    }
                }
                hobbies.append(hobby)

            return hobbies
