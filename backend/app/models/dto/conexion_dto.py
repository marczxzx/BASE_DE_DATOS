from pydantic import BaseModel, Field


class ConexionCreateDTO(BaseModel):
    """
    DTO para crear una conexión entre dos usuarios.
    """

    id_usuario_origen: int = Field(..., gt=0, description="ID del usuario que origina la conexión")
    id_usuario_destino: int = Field(..., gt=0, description="ID del usuario destino de la conexión")

    class Config:
        json_schema_extra = {
            "example": {
                "id_usuario_origen": 1,
                "id_usuario_destino": 5
            }
        }


class ConexionInfoDTO(BaseModel):
    """
    DTO para información de una conexión creada.
    """

    id_usuario_origen: int = Field(..., description="ID del usuario origen")
    usuario_origen: str = Field(..., description="Nombre completo del usuario origen")
    id_usuario_destino: int = Field(..., description="ID del usuario destino")
    usuario_destino: str = Field(..., description="Nombre completo del usuario destino")

    class Config:
        json_schema_extra = {
            "example": {
                "id_usuario_origen": 1,
                "usuario_origen": "juan pérez",
                "id_usuario_destino": 5,
                "usuario_destino": "maría garcía"
            }
        }


class ConexionCreateResponseDTO(BaseModel):
    """
    DTO para respuesta de creación de conexión.
    Envuelve los datos de la conexión con status y mensaje.
    """

    status_code: int = Field(..., description="Código de estado HTTP")
    message: str = Field(..., description="Mensaje de éxito")
    conexion: ConexionInfoDTO = Field(..., description="Datos de la conexión creada")

    class Config:
        json_schema_extra = {
            "example": {
                "status_code": 200,
                "message": "Conexión creada exitosamente entre juan pérez y maría garcía",
                "conexion": {
                    "id_usuario_origen": 1,
                    "usuario_origen": "juan pérez",
                    "id_usuario_destino": 5,
                    "usuario_destino": "maría garcía"
                }
            }
        }


class ConexionDeleteResponseDTO(BaseModel):
    """
    DTO para respuesta de eliminación de conexión.
    """

    status_code: int = Field(..., description="Código de estado HTTP")
    message: str = Field(..., description="Mensaje de éxito")

    class Config:
        json_schema_extra = {
            "example": {
                "status_code": 200,
                "message": "Conexión eliminada exitosamente entre juan pérez y maría garcía"
            }
        }
