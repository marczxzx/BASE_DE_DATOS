from typing import Dict, Any
from app.repositories.hobby_repository import HobbyRepository


class HobbyService:
    """
    Servicio para gestionar la lógica de negocio de hobbies.
    """

    def __init__(self, repository: HobbyRepository):
        self.repository = repository

    def get_all_hobbies(self) -> Dict[str, Any]:
        """
        Obtiene todos los hobbies disponibles con sus categorías.

        Returns:
            Dict con estructura:
            {
                "status_code": 200,
                "message": "Hobbies obtenidos exitosamente",
                "hobbies": [
                    {
                        "id_hobby": int,
                        "nombre": str,
                        "categoria": {
                            "id_categoria_hobby": int,
                            "nombre": str
                        }
                    },
                    ...
                ],
                "total": int
            }
        """
        hobbies = self.repository.get_all_hobbies()

        return {
            "status_code": 200,
            "message": "Hobbies obtenidos exitosamente",
            "hobbies": hobbies,
            "total": len(hobbies)
        }
