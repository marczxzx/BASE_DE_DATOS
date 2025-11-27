import unicodedata
from fastapi import HTTPException, status

from app.models.dto.usuario_dto import (
    UsuarioCreateDTO,
    UsuarioUpdateDTO,
    UsuarioPatchDTO,
    UsuarioResponseDTO,
    UsuarioCreateResponseDTO,
    UsuarioGetResponseDTO,
    UsuarioLightDTO,
    UsuarioListPaginatedResponseDTO,
    PaginationMetadata
)
from app.models.dto.conexion_dto import (
    ConexionCreateDTO,
    ConexionCreateResponseDTO,
    ConexionInfoDTO,
    ConexionDeleteResponseDTO
)
from app.repositories.usuario_repository import UsuarioRepository


def normalizar_texto(texto: str) -> str:
    """
    Normaliza texto para comparación:
    - Convierte a minúsculas
    - Remueve acentos/tildes
    - Preserva espacios y caracteres especiales básicos

    Args:
        texto: Texto a normalizar

    Returns:
        Texto normalizado (minúsculas, sin acentos)

    Ejemplo:
        "Rodrigó Pérez" -> "rodrigo perez"
    """
    # Convertir a minúsculas
    texto = texto.lower()
    # Normalizar Unicode (NFKD separa caracteres base de diacríticos)
    texto = unicodedata.normalize('NFKD', texto)
    # Remover diacríticos (acentos, tildes) manteniendo solo ASCII
    texto = texto.encode('ASCII', 'ignore').decode('ASCII')
    return texto


class UsuarioService:
    """
    Capa de servicio para lógica de negocio de Usuario.
    Sigue el Principio de Responsabilidad Única - maneja lógica de negocio y validación.
    Sigue el Principio de Inversión de Dependencias - depende de abstracción de repositorio.
    Sigue el Principio Abierto/Cerrado - abierto para extensión vía herencia.
    """

    def __init__(self, repository: UsuarioRepository):
        self.repository = repository

    def create_usuario(self, usuario_dto: UsuarioCreateDTO) -> UsuarioCreateResponseDTO:
        """
        Crea un nuevo usuario.

        Args:
            usuario_dto: DTO con datos de creación de usuario

        Returns:
            UsuarioCreateResponseDTO con status, mensaje y datos del usuario creado

        Raises:
            HTTPException: Si falla validación o ocurre error de creación
        """
        try:
            # Normalizar nombre y apellidos (minúsculas + remover acentos) para almacenamiento en BD
            nombre_normalizado = normalizar_texto(usuario_dto.nombre)
            apellidos_normalizado = normalizar_texto(usuario_dto.apellidos)

            # Validar unicidad: nombre + apellidos
            if self.repository.exists_by_nombre_apellidos(
                nombre_normalizado,
                apellidos_normalizado
            ):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Ya existe un usuario con el nombre '{usuario_dto.nombre} {usuario_dto.apellidos}'"
                )

            # Validar que el hobby existe si se proporciona
            if usuario_dto.id_hobby is not None:
                if not self.repository.hobby_exists(usuario_dto.id_hobby):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Hobby con ID {usuario_dto.id_hobby} no existe"
                    )

            # Convertir DTO a dict y excluir id_hobby para creación de usuario
            usuario_data = usuario_dto.model_dump(exclude={'id_hobby'})

            # Almacenar valores normalizados en BD
            usuario_data['nombre'] = nombre_normalizado
            usuario_data['apellidos'] = apellidos_normalizado

            # Crear usuario en repositorio (incluye relación con hobby si se proporciona)
            usuario = self.repository.create(usuario_data, id_hobby=usuario_dto.id_hobby)

            # Obtener usuario completo con hobby y conexiones
            usuario_completo = self.repository.find_by_id(usuario.to_dict()['id_usuario'])

            # Si no se encontró el usuario (no debería pasar), usar el objeto creado
            if usuario_completo is None:
                usuario_completo = usuario.to_dict()
                usuario_completo['hobby'] = None
                usuario_completo['conexiones'] = []

            # Crear respuesta con status, mensaje y datos del usuario
            return UsuarioCreateResponseDTO(
                status_code=status.HTTP_200_OK,
                message=f"Usuario {usuario_dto.nombre} {usuario_dto.apellidos} creado exitosamente",
                usuario=UsuarioResponseDTO(**usuario_completo)
            )

        except HTTPException:
            raise
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error de validacion: {str(e)}"
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al crear usuario: {str(e)}"
            )

    def get_usuario_by_id(self, id_usuario: int) -> UsuarioGetResponseDTO:
        """
        Obtiene un usuario por ID con hobby y conexiones.

        Args:
            id_usuario: ID de usuario a obtener

        Returns:
            UsuarioGetResponseDTO con status, mensaje y datos del usuario

        Raises:
            HTTPException: Si el usuario no se encuentra
        """
        usuario = self.repository.find_by_id(id_usuario)

        if not usuario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Usuario con ID {id_usuario} no encontrado"
            )

        return UsuarioGetResponseDTO(
            status_code=status.HTTP_200_OK,
            message="Usuario obtenido exitosamente",
            usuario=UsuarioResponseDTO(**usuario)
        )

    def get_all_usuarios(self, skip: int = 0, limit: int = 100) -> UsuarioListPaginatedResponseDTO:
        """
        Obtiene todos los usuarios con paginación OPTIMIZADA.

        OPTIMIZACIÓN: Usa find_all_light() que NO trae conexiones → 50-100x más rápido.
        Para obtener conexiones de un usuario específico, usar get_usuario_by_id().

        Args:
            skip: Número de registros a saltar (default: 0)
            limit: Número máximo de registros (default: 100, max: 1000)

        Returns:
            UsuarioListPaginatedResponseDTO con status, mensaje, lista de usuarios y metadata de paginación

        Raises:
            HTTPException: Si falla la validación
        """
        # Validar parámetros de paginación
        if skip < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El parámetro 'skip' debe ser mayor o igual a 0"
            )

        if limit < 1 or limit > 1000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El parámetro 'limit' debe estar entre 1 y 1000"
            )

        # Usar versión LIGERA (sin conexiones) para performance
        usuarios = self.repository.find_all_light(skip=skip, limit=limit)

        # Obtener total de usuarios para metadata de paginación
        total = self.repository.count_all()

        # Calcular metadata de paginación
        total_pages = (total + limit - 1) // limit  # Redondeo hacia arriba
        current_page = (skip // limit) + 1

        return UsuarioListPaginatedResponseDTO(
            status_code=status.HTTP_200_OK,
            message="Usuarios obtenidos exitosamente",
            usuarios=[UsuarioLightDTO(**usuario) for usuario in usuarios],
            pagination=PaginationMetadata(
                total=total,
                skip=skip,
                limit=limit,
                pages=total_pages,
                current_page=current_page
            )
        )

    def update_usuario(self, id_usuario: int, usuario_dto: UsuarioUpdateDTO) -> UsuarioResponseDTO:
        """
        Actualiza completamente un usuario (operación PUT).

        Args:
            id_usuario: User ID to update
            usuario_dto: Datos completos del usuario

        Returns:
            UsuarioResponseDTO con datos del usuario actualizado

        Raises:
            HTTPException: Si el usuario no se encuentra or validation fails
        """
        # Verificar que el usuario existe
        existing_usuario = self.repository.get_usuario_with_hobby(id_usuario)
        if not existing_usuario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Usuario con ID {id_usuario} no encontrado"
            )

        try:
            # Normalizar nombre y apellidos (minúsculas + remover acentos) para almacenamiento en BD
            nombre_normalizado = normalizar_texto(usuario_dto.nombre)
            apellidos_normalizado = normalizar_texto(usuario_dto.apellidos)

            # Validar unicidad: nombre + apellidos (excluding current user)
            if self.repository.exists_by_nombre_apellidos(
                nombre_normalizado,
                apellidos_normalizado,
                exclude_id=id_usuario
            ):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Ya existe otro usuario con el nombre '{usuario_dto.nombre} {usuario_dto.apellidos}'"
                )

            # Validar que el hobby existe si se proporciona
            if usuario_dto.id_hobby is not None:
                if not self.repository.hobby_exists(usuario_dto.id_hobby):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Hobby con ID {usuario_dto.id_hobby} no existe"
                    )

            # Convert DTO to dict and exclude id_hobby
            usuario_data = usuario_dto.model_dump(exclude={'id_hobby'})

            # Almacenar valores normalizados en BD
            usuario_data['nombre'] = nombre_normalizado
            usuario_data['apellidos'] = apellidos_normalizado

            # Actualizar usuario
            updated_usuario = self.repository.update(id_usuario, usuario_data)

            if not updated_usuario:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Error al actualizar usuario"
                )

            # Actualizar relación con hobby
            self.repository.update_hobby_relationship(id_usuario, usuario_dto.id_hobby)

            # Obtener usuario con info de hobby actualizada
            usuario_completo = self.repository.get_usuario_with_hobby(id_usuario)

            return UsuarioResponseDTO(**usuario_completo)

        except HTTPException:
            raise
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error de validacion: {str(e)}"
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al actualizar usuario: {str(e)}"
            )

    def patch_usuario(self, id_usuario: int, usuario_dto: UsuarioPatchDTO) -> UsuarioResponseDTO:
        """
        Actualiza parcialmente un usuario (operación PATCH).

        Args:
            id_usuario: User ID to update
            usuario_dto: Datos parciales del usuario (solo campos a actualizar)

        Returns:
            UsuarioResponseDTO con datos del usuario actualizado

        Raises:
            HTTPException: Si el usuario no se encuentra or validation fails
        """
        # Verificar que el usuario existe
        existing_usuario = self.repository.get_usuario_with_hobby(id_usuario)
        if not existing_usuario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Usuario con ID {id_usuario} no encontrado"
            )

        try:
            # Convertir DTO a dict, excluyendo valores None
            usuario_data = usuario_dto.model_dump(exclude_none=True)

            if not usuario_data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Debe proporcionar al menos un campo para actualizar"
                )

            # Extraer id_hobby si está presente
            id_hobby = usuario_data.pop('id_hobby', None)

            # Normalizar nombre y apellidos (minúsculas + remover acentos) si están presentes
            if 'nombre' in usuario_data:
                usuario_data['nombre'] = normalizar_texto(usuario_data['nombre'])
            if 'apellidos' in usuario_data:
                usuario_data['apellidos'] = normalizar_texto(usuario_data['apellidos'])

            # Validar unicidad si nombre o apellidos están siendo actualizados
            if 'nombre' in usuario_data or 'apellidos' in usuario_data:
                # Obtener datos actuales del usuario para completar campos faltantes
                nombre_to_check = usuario_data.get('nombre', existing_usuario['nombre'])
                apellidos_to_check = usuario_data.get('apellidos', existing_usuario['apellidos'])

                if self.repository.exists_by_nombre_apellidos(
                    nombre_to_check,
                    apellidos_to_check,
                    exclude_id=id_usuario
                ):
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"Ya existe otro usuario con el nombre '{nombre_to_check} {apellidos_to_check}'"
                    )

            # Validar que el hobby existe si se proporciona
            if id_hobby is not None:
                if not self.repository.hobby_exists(id_hobby):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Hobby con ID {id_hobby} no existe"
                    )

            # Actualizar usuario data (excluding id_hobby)
            if usuario_data:  # Solo si hay campos además de id_hobby
                updated_usuario = self.repository.patch(id_usuario, usuario_data)

                if not updated_usuario:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Error al actualizar usuario"
                    )

            # Actualizar relación con hobby if provided
            if id_hobby is not None:
                self.repository.update_hobby_relationship(id_usuario, id_hobby)

            # Obtener usuario con info de hobby actualizada
            usuario_completo = self.repository.get_usuario_with_hobby(id_usuario)

            return UsuarioResponseDTO(**usuario_completo)

        except HTTPException:
            raise
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error de validacion: {str(e)}"
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al actualizar usuario: {str(e)}"
            )

    def delete_usuario(self, id_usuario: int) -> dict:
        """
        Elimina un usuario y todas sus relaciones (CASCADA).

        Args:
            id_usuario: User ID to delete

        Returns:
            Mensaje de éxito

        Raises:
            HTTPException: Si el usuario no se encuentra
        """
        # Verificar que el usuario existe before deleting
        existing_usuario = self.repository.find_by_id(id_usuario)
        if not existing_usuario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Usuario con ID {id_usuario} no encontrado"
            )

        try:
            # Eliminar usuario (CASCADA - las relaciones también se eliminan)
            deleted = self.repository.delete(id_usuario)

            if not deleted:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Error al eliminar usuario"
                )

            return {
                "message": f"Usuario con ID {id_usuario} eliminado exitosamente (incluidas todas sus relaciones)"
            }

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al eliminar usuario: {str(e)}"
            )

    def create_conexion(self, conexion_dto: ConexionCreateDTO) -> ConexionCreateResponseDTO:
        """
        Crea una conexión direccional entre dos usuarios.

        Args:
            conexion_dto: DTO con IDs de usuarios origen y destino

        Returns:
            ConexionCreateResponseDTO con status, mensaje y datos de la conexión

        Raises:
            HTTPException: Si falla validación o ocurre error de creación
        """
        try:
            id_origen = conexion_dto.id_usuario_origen
            id_destino = conexion_dto.id_usuario_destino

            # Validar que no sea auto-conexión
            if id_origen == id_destino:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No se puede crear una conexión del usuario consigo mismo"
                )

            # Validar que usuario origen existe
            usuario_origen = self.repository.find_by_id(id_origen)
            if not usuario_origen:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Usuario origen con ID {id_origen} no encontrado"
                )

            # Validar que usuario destino existe
            usuario_destino = self.repository.find_by_id(id_destino)
            if not usuario_destino:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Usuario destino con ID {id_destino} no encontrado"
                )

            # Obtener nombres completos
            nombre_origen = self.repository.get_usuario_nombre_completo(id_origen)
            nombre_destino = self.repository.get_usuario_nombre_completo(id_destino)

            # Validar que la conexión no existe ya
            if self.repository.conexion_exists(id_origen, id_destino):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"La conexión entre {nombre_origen} y {nombre_destino} ya existe"
                )

            # Crear la conexión
            self.repository.create_conexion(id_origen, id_destino)

            # Crear respuesta con status, mensaje y datos de la conexión
            return ConexionCreateResponseDTO(
                status_code=status.HTTP_200_OK,
                message=f"Conexión creada exitosamente entre {nombre_origen} y {nombre_destino}",
                conexion=ConexionInfoDTO(
                    id_usuario_origen=id_origen,
                    usuario_origen=nombre_origen,
                    id_usuario_destino=id_destino,
                    usuario_destino=nombre_destino
                )
            )

        except HTTPException:
            raise
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error de validación: {str(e)}"
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al crear conexión: {str(e)}"
            )

    def delete_conexion(self, id_origen: int, id_destino: int) -> ConexionDeleteResponseDTO:
        """
        Elimina una conexión direccional entre dos usuarios.

        Args:
            id_origen: ID del usuario origen
            id_destino: ID del usuario destino

        Returns:
            ConexionDeleteResponseDTO con status y mensaje

        Raises:
            HTTPException: Si falla validación o no existe la conexión
        """
        try:
            # Validar que no sea auto-conexión
            if id_origen == id_destino:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No se puede eliminar una conexión del usuario consigo mismo"
                )

            # Validar que usuario origen existe
            usuario_origen = self.repository.find_by_id(id_origen)
            if not usuario_origen:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Usuario origen con ID {id_origen} no encontrado"
                )

            # Validar que usuario destino existe
            usuario_destino = self.repository.find_by_id(id_destino)
            if not usuario_destino:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Usuario destino con ID {id_destino} no encontrado"
                )

            # Obtener nombres completos
            nombre_origen = self.repository.get_usuario_nombre_completo(id_origen)
            nombre_destino = self.repository.get_usuario_nombre_completo(id_destino)

            # Intentar eliminar la conexión
            deleted = self.repository.delete_conexion(id_origen, id_destino)

            if not deleted:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"La conexión entre {nombre_origen} y {nombre_destino} no existe"
                )

            # Crear respuesta con status y mensaje
            return ConexionDeleteResponseDTO(
                status_code=status.HTTP_200_OK,
                message=f"Conexión eliminada exitosamente entre {nombre_origen} y {nombre_destino}"
            )

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al eliminar conexión: {str(e)}"
            )

    def get_usuario_conexiones(self, id_usuario: int):
        """
        Obtiene todas las conexiones de un usuario.

        Args:
            id_usuario: ID del usuario

        Returns:
            GetUsuarioConexionesResponseDTO con lista de usuarios conectados

        Raises:
            HTTPException: Si el usuario no existe o hay un error
        """
        try:
            # Obtener conexiones del repository
            conexiones_data = self.repository.get_usuario_conexiones(id_usuario)

            # Convertir a DTOs
            from app.models.dto.usuario_dto import UsuarioConexionDTO, GetUsuarioConexionesResponseDTO

            conexiones_dtos = [
                UsuarioConexionDTO(**conexion)
                for conexion in conexiones_data
            ]

            return GetUsuarioConexionesResponseDTO(
                status_code=status.HTTP_200_OK,
                id_usuario=id_usuario,
                conexiones=conexiones_dtos
            )

        except HTTPException:
            raise
        except Exception as e:
            # Si el error es que el usuario no existe, devolver 404
            if "no encontrado" in str(e).lower():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=str(e)
                )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al obtener conexiones: {str(e)}"
            )
