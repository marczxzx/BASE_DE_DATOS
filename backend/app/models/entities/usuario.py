from typing import Optional
from dataclasses import dataclass


@dataclass
class Usuario:
    """
    Entidad de dominio Usuario.
    Representa un nodo de usuario en la base de datos de grafos.
    Sigue el Principio de Responsabilidad Única - solo representa el modelo de dominio.
    """

    id_usuario: int
    nombre: str
    apellidos: str
    edad: int
    latitud: float
    longitud: float

    def __post_init__(self):
        """Valida invariantes de la entidad."""
        if self.edad < 0:
            raise ValueError("La edad no puede ser negativa")
        if not -90 <= self.latitud <= 90:
            raise ValueError("La latitud debe estar entre -90 y 90")
        if not -180 <= self.longitud <= 180:
            raise ValueError("La longitud debe estar entre -180 y 180")

    def to_dict(self) -> dict:
        """Convierte entidad a diccionario."""
        return {
            "id_usuario": self.id_usuario,
            "nombre": self.nombre,
            "apellidos": self.apellidos,
            "edad": self.edad,
            "latitud": self.latitud,
            "longitud": self.longitud
        }
