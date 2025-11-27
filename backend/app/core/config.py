from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """
    Configuración de la aplicación cargada desde variables de entorno.
    Sigue el principio de responsabilidad única: solo maneja la configuración.
    """

    # Configuración de Base de Datos
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5433
    POSTGRES_DB: str = "social_graph_analyzer"
    POSTGRES_USER: str = "graph_user"
    POSTGRES_PASSWORD: str = "graph_user_password"

    # Base de Datos de Grafos
    GRAPH_NAME: str = "red_usuarios"

    # Configuración de la Aplicación
    APP_NAME: str = "Social Graph Analyzer API"
    APP_VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = True

    # Configuración del Servidor
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    class Config:
        env_file = ".env"
        case_sensitive = True

    @property
    def database_url(self) -> str:
        """Construye una cadena de conexión PostgreSQL."""
        return (
            f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )


# Instancia global de configuración (Singleton)
settings = Settings()
