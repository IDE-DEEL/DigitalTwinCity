from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    DATABASE_URL: str
    ADMIN_USERNAME: str
    ADMIN_PASSWORD: str
    SECRET_KEY: str
    CORS_ALLOW_ORIGINS: str = ""
    SESSION_COOKIE_NAME: str = "deel_session"
    SESSION_COOKIE_SECURE: bool = True
    SESSION_COOKIE_SAMESITE: str = "lax"
    SESSION_COOKIE_DOMAIN: str | None = None
    MQTT_HOST: str
    MQTT_PORT: int = 443
    MQTT_PATH: str = "/mqtt"
    MQTT_USERNAME: str
    MQTT_PASSWORD: str

    @property
    def cors_allow_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.CORS_ALLOW_ORIGINS.split(",")
            if origin.strip()
        ]

    @property
    def session_cookie_domain(self) -> str | None:
        return self.SESSION_COOKIE_DOMAIN or None

    # Zorgt dat Pydantic het .env bestand leest
    model_config = SettingsConfigDict(env_file="././.env")

# Maak één instantie van de instellingen aan
settings = Settings()
