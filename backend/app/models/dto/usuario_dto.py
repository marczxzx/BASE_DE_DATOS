from pydantic import BaseModel, Field, field_validator
from typing import Optional, List


class UsuarioCreateDTO(BaseModel):
    """
    DTO para crear un nuevo usuario.
    Sigue el Principio de Segregación de Interfaz - solo incluye campos necesarios para creación.
    Incluye validaciones de formato y normalización automática.
    """

    nombre: str = Field(..., min_length=1, max_length=100, description="Nombre del usuario")
    apellidos: str = Field(..., min_length=1, max_length=100, description="Apellidos del usuario")
    edad: int = Field(..., ge=12, le=150, description="Edad del usuario (minimo 12 años)")
    latitud: float = Field(..., ge=-90, le=90, description="Latitud de ubicacion")
    longitud: float = Field(..., ge=-180, le=180, description="Longitud de ubicacion")
    id_hobby: Optional[int] = Field(None, ge=1, description="ID del hobby (opcional)")

    @field_validator('nombre', 'apellidos')
    @classmethod
    def normalize_text(cls, v: str) -> str:
        """
        Normaliza campos de texto:
        - Elimina espacios al inicio y final
        - Remueve espacios extra entre palabras
        Nota: La conversión a minúsculas ocurre en la capa de servicio antes de guardar en BD
        """
        if not v or not v.strip():
            raise ValueError("El campo no puede estar vacio o contener solo espacios")

        # Eliminar espacios extras
        return ' '.join(v.strip().split())

    @field_validator('edad')
    @classmethod
    def validate_edad(cls, v: int) -> int:
        """Valida edad mínima de 12 años."""
        if v < 12:
            raise ValueError("La edad minima permitida es 12 años")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "nombre": "juan",
                "apellidos": "perez garcia",
                "edad": 30,
                "latitud": 40.4168,
                "longitud": -3.7038,
                "id_hobby": 10
            }
        }


class UsuarioUpdateDTO(BaseModel):
    """
    DTO para actualización completa (PUT) de un usuario.
    Todos los campos son requeridos para reemplazo completo.
    Incluye validaciones de formato y normalización automática.
    """

    nombre: str = Field(..., min_length=1, max_length=100, description="Nombre del usuario")
    apellidos: str = Field(..., min_length=1, max_length=100, description="Apellidos del usuario")
    edad: int = Field(..., ge=12, le=150, description="Edad del usuario (minimo 12 años)")
    latitud: float = Field(..., ge=-90, le=90, description="Latitud de ubicacion")
    longitud: float = Field(..., ge=-180, le=180, description="Longitud de ubicacion")
    id_hobby: Optional[int] = Field(None, ge=1, description="ID del hobby (opcional)")

    @field_validator('nombre', 'apellidos')
    @classmethod
    def normalize_text(cls, v: str) -> str:
        """Normaliza campos de texto (elimina espacios extras)."""
        if not v or not v.strip():
            raise ValueError("El campo no puede estar vacio o contener solo espacios")
        return ' '.join(v.strip().split())

    @field_validator('edad')
    @classmethod
    def validate_edad(cls, v: int) -> int:
        """Valida edad mínima de 12 años."""
        if v < 12:
            raise ValueError("La edad minima permitida es 12 años")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "nombre": "juan",
                "apellidos": "perez garcia",
                "edad": 31,
                "latitud": 40.4168,
                "longitud": -3.7038,
                "id_hobby": 15
            }
        }


class UsuarioPatchDTO(BaseModel):
    """
    DTO para actualización parcial (PATCH) de un usuario.
    Todos los campos son opcionales para actualizaciones selectivas.
    Incluye validaciones de formato y normalización automática.
    """

    nombre: Optional[str] = Field(None, min_length=1, max_length=100, description="Nombre del usuario")
    apellidos: Optional[str] = Field(None, min_length=1, max_length=100, description="Apellidos del usuario")
    edad: Optional[int] = Field(None, ge=12, le=150, description="Edad del usuario (minimo 12 años)")
    latitud: Optional[float] = Field(None, ge=-90, le=90, description="Latitud de ubicacion")
    longitud: Optional[float] = Field(None, ge=-180, le=180, description="Longitud de ubicacion")
    id_hobby: Optional[int] = Field(None, ge=1, description="ID del hobby (opcional)")

    @field_validator('nombre', 'apellidos')
    @classmethod
    def normalize_text(cls, v: Optional[str]) -> Optional[str]:
        """Normaliza campos de texto (elimina espacios extras)."""
        if v is None:
            return v
        if not v.strip():
            raise ValueError("El campo no puede estar vacio o contener solo espacios")
        return ' '.join(v.strip().split())

    @field_validator('edad')
    @classmethod
    def validate_edad(cls, v: Optional[int]) -> Optional[int]:
        """Valida edad mínima de 12 años."""
        if v is not None and v < 12:
            raise ValueError("La edad minima permitida es 12 años")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "edad": 32,
                "id_hobby": 20
            }
        }


class CategoriaHobbyDTO(BaseModel):
    """DTO para información de categoría de hobby."""
    id_categoria_hobby: int = Field(..., description="ID de la categoria del hobby")
    nombre: str = Field(..., description="Nombre de la categoria del hobby")


class HobbyInfoDTO(BaseModel):
    """DTO para información de hobby en respuesta de usuario."""
    id_hobby: int = Field(..., description="ID del hobby")
    nombre: str = Field(..., description="Nombre del hobby")
    categoria: CategoriaHobbyDTO = Field(..., description="Categoria del hobby")


class UsuarioConexionDTO(BaseModel):
    """
    DTO para usuario en lista de conexiones.
    Similar a UsuarioResponseDTO pero SIN el campo 'conexiones' para evitar recursión.
    """

    id_usuario: int = Field(..., description="ID unico del usuario")
    nombre: str = Field(..., description="Nombre del usuario")
    apellidos: str = Field(..., description="Apellidos del usuario")
    edad: int = Field(..., description="Edad del usuario")
    latitud: float = Field(..., description="Latitud de ubicacion")
    longitud: float = Field(..., description="Longitud de ubicacion")
    hobby: Optional[HobbyInfoDTO] = Field(None, description="Informacion del hobby del usuario")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id_usuario": 2,
                "nombre": "juan",
                "apellidos": "pérez",
                "edad": 25,
                "latitud": 40.4168,
                "longitud": -3.7038,
                "hobby": {
                    "id_hobby": 1,
                    "nombre": "correr",
                    "categoria": {
                        "id_categoria_hobby": 1,
                        "nombre": "Deportes"
                    }
                }
            }
        }


class UsuarioResponseDTO(BaseModel):
    """
    DTO para respuesta de usuario.
    Incluye todos los datos del usuario incluyendo ID.
    """

    id_usuario: int = Field(..., description="ID unico del usuario")
    nombre: str = Field(..., description="Nombre del usuario")
    apellidos: str = Field(..., description="Apellidos del usuario")
    edad: int = Field(..., description="Edad del usuario")
    latitud: float = Field(..., description="Latitud de ubicacion")
    longitud: float = Field(..., description="Longitud de ubicacion")
    hobby: Optional[HobbyInfoDTO] = Field(None, description="Informacion del hobby del usuario")
    conexiones: List[int] = Field(default_factory=list, description="Lista de IDs de usuarios conectados")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id_usuario": 1,
                "nombre": "juan",
                "apellidos": "perez garcia",
                "edad": 30,
                "latitud": 40.4168,
                "longitud": -3.7038,
                "hobby": {
                    "id_hobby": 10,
                    "nombre": "pescar",
                    "categoria": {
                        "id_categoria_hobby": 2,
                        "nombre": "actividades al aire libre"
                    }
                },
                "conexiones": [3, 5, 7]
            }
        }


class UsuarioCreateResponseDTO(BaseModel):
    """
    DTO para respuesta de creación de usuario.
    Envuelve los datos del usuario con status y mensaje.
    """

    status_code: int = Field(..., description="Código de estado HTTP")
    message: str = Field(..., description="Mensaje de exito")
    usuario: UsuarioResponseDTO = Field(..., description="Datos del usuario creado")

    class Config:
        json_schema_extra = {
            "example": {
                "status_code": 200,
                "message": "Usuario juan perez creado exitosamente",
                "usuario": {
                    "id_usuario": 12,
                    "nombre": "juan",
                    "apellidos": "perez",
                    "edad": 30,
                    "latitud": 40.4168,
                    "longitud": -3.7038,
                    "hobby": {
                        "id_hobby": 10,
                        "nombre": "pescar",
                        "categoria": {
                            "id_categoria_hobby": 2,
                            "nombre": "actividades al aire libre"
                        }
                    },
                    "conexiones": []
                }
            }
        }


class UsuarioGetResponseDTO(BaseModel):
    """
    DTO para respuesta de obtener un usuario por ID.
    Envuelve los datos del usuario con status y mensaje.
    """

    status_code: int = Field(..., description="Código de estado HTTP")
    message: str = Field(..., description="Mensaje de éxito")
    usuario: UsuarioResponseDTO = Field(..., description="Datos del usuario")

    class Config:
        json_schema_extra = {
            "example": {
                "status_code": 200,
                "message": "Usuario obtenido exitosamente",
                "usuario": {
                    "id_usuario": 19,
                    "nombre": "rodrigo",
                    "apellidos": "infanzon acosta",
                    "edad": 21,
                    "latitud": 40.4168,
                    "longitud": -3.7038,
                    "hobby": {
                        "id_hobby": 10,
                        "nombre": "pescar",
                        "categoria": {
                            "id_categoria_hobby": 2,
                            "nombre": "actividades al aire libre"
                        }
                    },
                    "conexiones": [1, 3, 5]
                }
            }
        }


class UsuarioLightDTO(BaseModel):
    """
    DTO ligero para listados - SIN conexiones (optimizado para performance).
    Usado en GET /usuarios para evitar queries costosas con muchos usuarios.
    Para obtener conexiones, usar GET /usuarios/{id}.
    """
    id_usuario: int = Field(..., description="ID unico del usuario")
    nombre: str = Field(..., description="Nombre del usuario")
    apellidos: str = Field(..., description="Apellidos del usuario")
    edad: int = Field(..., description="Edad del usuario")
    latitud: float = Field(..., description="Latitud de ubicacion")
    longitud: float = Field(..., description="Longitud de ubicacion")
    hobby: Optional[HobbyInfoDTO] = Field(None, description="Informacion del hobby del usuario")
    # ❌ NO incluye conexiones → evita collect() costoso en queries masivas

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id_usuario": 19,
                "nombre": "rodrigo",
                "apellidos": "infanzon acosta",
                "edad": 21,
                "latitud": 40.4168,
                "longitud": -3.7038,
                "hobby": {
                    "id_hobby": 10,
                    "nombre": "pescar",
                    "categoria": {
                        "id_categoria_hobby": 2,
                        "nombre": "actividades al aire libre"
                    }
                }
            }
        }


class PaginationMetadata(BaseModel):
    """Metadata de paginación para respuestas de listados."""
    total: int = Field(..., description="Total de registros en la base de datos")
    skip: int = Field(..., description="Registros saltados (offset)")
    limit: int = Field(..., description="Registros por pagina")
    pages: int = Field(..., description="Total de paginas disponibles")
    current_page: int = Field(..., description="Pagina actual (1-indexed)")

    class Config:
        json_schema_extra = {
            "example": {
                "total": 100000,
                "skip": 0,
                "limit": 100,
                "pages": 1000,
                "current_page": 1
            }
        }


class UsuarioListPaginatedResponseDTO(BaseModel):
    """
    DTO para respuesta de listado de usuarios con paginación optimizada.
    Incluye metadata de paginación para facilitar navegación en frontend.
    """
    status_code: int = Field(..., description="Código de estado HTTP")
    message: str = Field(..., description="Mensaje de éxito")
    usuarios: List[UsuarioLightDTO] = Field(..., description="Lista de usuarios (sin conexiones)")
    pagination: PaginationMetadata = Field(..., description="Metadata de paginacion")

    class Config:
        json_schema_extra = {
            "example": {
                "status_code": 200,
                "message": "Usuarios obtenidos exitosamente",
                "usuarios": [
                    {
                        "id_usuario": 19,
                        "nombre": "rodrigo",
                        "apellidos": "infanzon acosta",
                        "edad": 21,
                        "latitud": 40.4168,
                        "longitud": -3.7038,
                        "hobby": {
                            "id_hobby": 10,
                            "nombre": "pescar",
                            "categoria": {
                                "id_categoria_hobby": 2,
                                "nombre": "actividades al aire libre"
                            }
                        }
                    }
                ],
                "pagination": {
                    "total": 100000,
                    "skip": 0,
                    "limit": 100,
                    "pages": 1000,
                    "current_page": 1
                }
            }
        }


class UsuarioListResponseDTO(BaseModel):
    """
    DTO para respuesta de listar usuarios.
    Envuelve la lista de usuarios con status y mensaje.
    DEPRECATED: Usar UsuarioListPaginatedResponseDTO para mejor performance.
    """

    status_code: int = Field(..., description="Código de estado HTTP")
    message: str = Field(..., description="Mensaje de éxito")
    usuarios: List[UsuarioResponseDTO] = Field(..., description="Lista de usuarios")

    class Config:
        json_schema_extra = {
            "example": {
                "status_code": 200,
                "message": "Usuarios obtenidos exitosamente",
                "usuarios": [
                    {
                        "id_usuario": 19,
                        "nombre": "rodrigo",
                        "apellidos": "infanzon acosta",
                        "edad": 21,
                        "latitud": 40.4168,
                        "longitud": -3.7038,
                        "hobby": {
                            "id_hobby": 10,
                            "nombre": "pescar",
                            "categoria": {
                                "id_categoria_hobby": 2,
                                "nombre": "actividades al aire libre"
                            }
                        },
                        "conexiones": [1, 3, 5, 7]
                    }
                ]
            }
        }


class GetUsuarioConexionesResponseDTO(BaseModel):
    """
    DTO para respuesta de obtener conexiones de un usuario.
    Devuelve lista de usuarios conectados sin el campo 'conexiones' para evitar recursión.
    """

    status_code: int = Field(..., description="Código de estado HTTP")
    id_usuario: int = Field(..., description="ID del usuario consultado")
    conexiones: List[UsuarioConexionDTO] = Field(..., description="Lista de usuarios conectados")

    class Config:
        json_schema_extra = {
            "example": {
                "status_code": 200,
                "id_usuario": 1,
                "conexiones": [
                    {
                        "id_usuario": 2,
                        "nombre": "juan",
                        "apellidos": "pérez",
                        "edad": 25,
                        "latitud": 40.4168,
                        "longitud": -3.7038,
                        "hobby": {
                            "id_hobby": 1,
                            "nombre": "correr",
                            "categoria": {
                                "id_categoria_hobby": 1,
                                "nombre": "Deportes"
                            }
                        }
                    },
                    {
                        "id_usuario": 5,
                        "nombre": "maría",
                        "apellidos": "gonzález",
                        "edad": 30,
                        "latitud": 41.3851,
                        "longitud": 2.1734,
                        "hobby": None
                    }
                ]
            }
        }
