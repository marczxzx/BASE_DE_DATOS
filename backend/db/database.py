import psycopg
from psycopg.rows import dict_row
from typing import Optional
from contextlib import contextmanager

from app.core.config import settings


class DatabaseConnection:
    """
    Administrador de conexión a base de datos para PostgreSQL con Apache AGE.
    Sigue el Principio de Responsabilidad Única - solo maneja conexiones a la base de datos.
    Usa psycopg3 para compatibilidad con Python 3.14+.
    """

    def __init__(self):
        self._connection: Optional[psycopg.Connection] = None

    def connect(self) -> psycopg.Connection:
        """Establece conexión a la base de datos PostgreSQL."""
        if self._connection is None or self._connection.closed:
            self._connection = psycopg.connect(
                host=settings.POSTGRES_HOST,
                port=settings.POSTGRES_PORT,
                dbname=settings.POSTGRES_DB,
                user=settings.POSTGRES_USER,
                password=settings.POSTGRES_PASSWORD,
                row_factory=dict_row
            )
            # Establecer search path para incluir ag_catalog para Apache AGE
            with self._connection.cursor() as cur:
                cur.execute("SET search_path = ag_catalog, '$user', public;")
                cur.execute("LOAD 'age';")
            self._connection.commit()
        return self._connection

    def close(self):
        """Cierra la conexión a la base de datos."""
        if self._connection and not self._connection.closed:
            self._connection.close()
            self._connection = None

    @contextmanager
    def get_cursor(self):
        """
        Context manager para cursor de base de datos.
        Hace commit automáticamente si tiene éxito o rollback si hay error.
        """
        conn = self.connect()
        cursor = conn.cursor()
        try:
            yield cursor
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()

    @contextmanager
    def get_connection(self):
        """
        Context manager para conexión a base de datos.
        Retorna la conexión activa.
        """
        conn = self.connect()
        try:
            yield conn
        finally:
            pass  # La conexión se mantiene viva para reutilización


# Instancia singleton
db_connection = DatabaseConnection()


def get_db():
    """
    Función de inyección de dependencias para FastAPI.
    Retorna la conexión a la base de datos.
    """
    return db_connection
