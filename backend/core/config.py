from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    DATABASE_URL: str
    ADMIN_USERNAME: str
    ADMIN_PASSWORD: str
    SECRET_KEY: str
    # Zorgt dat Pydantic het .env bestand leest
    model_config = SettingsConfigDict(env_file="././.env")

# Maak één instantie van de instellingen aan
settings = Settings()