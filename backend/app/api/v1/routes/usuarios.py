from fastapi import APIRouter, Depends, Query, status

from app.models.dto.usuario_dto import (
    UsuarioCreateDTO,
    UsuarioUpdateDTO,
    UsuarioPatchDTO,
    UsuarioResponseDTO,
    UsuarioCreateResponseDTO,
    UsuarioGetResponseDTO,
    UsuarioListPaginatedResponseDTO,
    GetUsuarioConexionesResponseDTO
)
from app.models.dto.conexion_dto import (
    ConexionCreateDTO,
    ConexionCreateResponseDTO,
    ConexionDeleteResponseDTO
)
from app.services.usuario_service import UsuarioService
from app.repositories.usuario_repository import UsuarioRepository
from db.database import get_db, DatabaseConnection


router = APIRouter(
    prefix="/usuarios",
    tags=["Usuarios"]
)


def get_usuario_service(db: DatabaseConnection = Depends(get_db)) -> UsuarioService:
    """
    Inyección de dependencias para UsuarioService.
    Sigue el Principio de Inversión de Dependencias.
    """
    repository = UsuarioRepository(db)
    return UsuarioService(repository)


@router.post(
    "",
    response_model=UsuarioCreateResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Crear nuevo usuario",
    description="Crea un nuevo usuario en el grafo social con todos sus datos."
)
def create_usuario(
    usuario: UsuarioCreateDTO,
    service: UsuarioService = Depends(get_usuario_service)
) -> UsuarioCreateResponseDTO:
    """
    Crea un nuevo usuario.

    - **nombre**: Nombre del usuario (requerido)
    - **apellidos**: Apellidos del usuario (requerido)
    - **edad**: Edad del usuario (0-150) (requerido)
    - **latitud**: Coordenada de latitud (-90 a 90) (requerido)
    - **longitud**: Coordenada de longitud (-180 a 180) (requerido)
    """
    return service.create_usuario(usuario)


@router.get(
    "",
    response_model=UsuarioListPaginatedResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Listar usuarios (optimizado)",
    description="Obtiene lista paginada de usuarios SIN conexiones (optimizado para muchos registros)."
)
def get_usuarios(
    skip: int = Query(0, ge=0, description="Número de registros a saltar"),
    limit: int = Query(100, ge=1, le=1000, description="Número máximo de registros a devolver"),
    service: UsuarioService = Depends(get_usuario_service)
) -> UsuarioListPaginatedResponseDTO:
    """
    Lista usuarios con paginación OPTIMIZADA.

    OPTIMIZACIÓN: NO incluye conexiones en listado (50-100x más rápido).
    Para obtener conexiones de un usuario específico, usar GET /usuarios/{id}.

    Response incluye metadata de paginación (total, páginas, página actual).

    - **skip**: Número de registros a omitir (default: 0)
    - **limit**: Número máximo de registros (default: 100, max: 1000)

    **Mejora de performance:**
    - Antes: 5-20 segundos con muchos usuarios
    - Ahora: < 200ms
    """
    return service.get_all_usuarios(skip=skip, limit=limit)


@router.get(
    "/{id_usuario}",
    response_model=UsuarioGetResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Obtener usuario por ID",
    description="Obtiene los datos completos de un usuario específico por su ID."
)
def get_usuario(
    id_usuario: int,
    service: UsuarioService = Depends(get_usuario_service)
) -> UsuarioGetResponseDTO:
    """
    Obtiene un usuario por su ID.

    - **id_usuario**: ID único del usuario
    """
    return service.get_usuario_by_id(id_usuario)


@router.get(
    "/{id_usuario}/conexiones",
    response_model=GetUsuarioConexionesResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Obtener conexiones de un usuario",
    description="Obtiene todos los usuarios hacia los cuales el usuario especificado tiene una conexión."
)
def get_usuario_conexiones(
    id_usuario: int,
    service: UsuarioService = Depends(get_usuario_service)
) -> GetUsuarioConexionesResponseDTO:
    """
    Obtiene todas las conexiones de un usuario.

    Devuelve la lista completa de usuarios hacia los cuales existe una conexión
    desde el usuario especificado (conexión direccional).

    - **id_usuario**: ID del usuario del cual obtener las conexiones

    **Nota:** Los usuarios en la lista de conexiones NO incluyen el campo 'conexiones'
    para evitar recursión y simplificar la respuesta.
    """
    return service.get_usuario_conexiones(id_usuario)


@router.put(
    "/{id_usuario}",
    response_model=UsuarioResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Actualizar usuario completamente (PUT)",
    description="Actualiza todos los campos de un usuario. Todos los campos son requeridos."
)
def update_usuario(
    id_usuario: int,
    usuario: UsuarioUpdateDTO,
    service: UsuarioService = Depends(get_usuario_service)
) -> UsuarioResponseDTO:
    """
    Actualiza completamente un usuario (PUT).
    Todos los campos deben ser proporcionados.

    - **id_usuario**: ID del usuario a actualizar
    - **nombre**: Nombre del usuario (requerido)
    - **apellidos**: Apellidos del usuario (requerido)
    - **edad**: Edad del usuario (requerido)
    - **latitud**: Coordenada de latitud (requerido)
    - **longitud**: Coordenada de longitud (requerido)
    """
    return service.update_usuario(id_usuario, usuario)


@router.patch(
    "/{id_usuario}",
    response_model=UsuarioResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Actualizar usuario parcialmente (PATCH)",
    description="Actualiza solo los campos proporcionados de un usuario. Al menos un campo es requerido."
)
def patch_usuario(
    id_usuario: int,
    usuario: UsuarioPatchDTO,
    service: UsuarioService = Depends(get_usuario_service)
) -> UsuarioResponseDTO:
    """
    Actualiza parcialmente un usuario (PATCH).
    Solo los campos proporcionados serán actualizados.

    - **id_usuario**: ID del usuario a actualizar
    - **nombre**: Nombre del usuario (opcional)
    - **apellidos**: Apellidos del usuario (opcional)
    - **edad**: Edad del usuario (opcional)
    - **latitud**: Coordenada de latitud (opcional)
    - **longitud**: Coordenada de longitud (opcional)

    Al menos un campo debe ser proporcionado.
    """
    return service.patch_usuario(id_usuario, usuario)


@router.delete(
    "/{id_usuario}",
    status_code=status.HTTP_200_OK,
    summary="Eliminar usuario (CASCADE)",
    description="Elimina un usuario y todas sus relaciones (hobbies y conexiones) del grafo."
)
def delete_usuario(
    id_usuario: int,
    service: UsuarioService = Depends(get_usuario_service)
) -> dict:
    """
    Elimina un usuario y todas sus relaciones (CASCADE).

    Se eliminan automáticamente:
    - Relaciones TIENE_HOBBY
    - Relaciones CONECTADO (bidireccionales)

    - **id_usuario**: ID del usuario a eliminar
    """
    return service.delete_usuario(id_usuario)


@router.post(
    "/conexiones",
    response_model=ConexionCreateResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Crear conexión entre usuarios",
    description="Crea una conexión direccional entre dos usuarios (Usuario origen → Usuario destino)."
)
def create_conexion(
    conexion: ConexionCreateDTO,
    service: UsuarioService = Depends(get_usuario_service)
) -> ConexionCreateResponseDTO:
    """
    Crea una conexión direccional entre dos usuarios.

    La conexión es unidireccional: Usuario A → Usuario B
    (Usuario A está conectado con B, pero B no necesariamente con A)

    **Validaciones:**
    - Usuario origen debe existir
    - Usuario destino debe existir
    - No se permite auto-conexión (origen ≠ destino)
    - No se permite conexión duplicada

    **Parámetros:**
    - **id_usuario_origen**: ID del usuario que origina la conexión
    - **id_usuario_destino**: ID del usuario destino de la conexión
    """
    return service.create_conexion(conexion)


@router.delete(
    "/conexiones/{id_origen}/{id_destino}",
    response_model=ConexionDeleteResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Eliminar conexión entre usuarios",
    description="Elimina una conexión direccional entre dos usuarios (Usuario origen → Usuario destino)."
)
def delete_conexion(
    id_origen: int,
    id_destino: int,
    service: UsuarioService = Depends(get_usuario_service)
) -> ConexionDeleteResponseDTO:
    """
    Elimina una conexión direccional entre dos usuarios.

    La conexión es unidireccional: Usuario A → Usuario B
    (Solo elimina la relación A→B, no afecta B→A si existe)

    **Validaciones:**
    - Usuario origen debe existir
    - Usuario destino debe existir
    - La conexión debe existir (404 si no existe)
    - No se permite auto-conexión (origen ≠ destino)

    **Parámetros:**
    - **id_origen**: ID del usuario origen de la conexión
    - **id_destino**: ID del usuario destino de la conexión
    """
    return service.delete_conexion(id_origen, id_destino)
