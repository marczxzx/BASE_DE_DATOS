from fastapi import APIRouter, Depends, status

from app.repositories.hobby_repository import HobbyRepository
from app.services.hobby_service import HobbyService
from db.database import get_db, DatabaseConnection


router = APIRouter(
    prefix="/hobbies",
    tags=["Hobbies"]
)


def get_hobby_service(db: DatabaseConnection = Depends(get_db)) -> HobbyService:
    """
    Inyección de dependencias para HobbyService.
    """
    repository = HobbyRepository(db)
    return HobbyService(repository)


@router.get(
    "",
    status_code=status.HTTP_200_OK,
    summary="Listar todos los hobbies",
    description="Obtiene la lista completa de hobbies disponibles en el sistema."
)
def get_hobbies(
    service: HobbyService = Depends(get_hobby_service)
) -> dict:
    """
    Obtiene todos los hobbies disponibles.

    Devuelve la lista completa de hobbies con sus categorías asociadas.

    **Nota:** Este endpoint no requiere paginación ya que el número de hobbies
    es limitado y estable.
    """
    return service.get_all_hobbies()
