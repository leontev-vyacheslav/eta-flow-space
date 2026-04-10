from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:0987654321@localhost:35432/eta_flow_space_database"
    DATABASE_POOL_SIZE: int = 5
    DATABASE_MAX_OVERFLOW: int = 10
    JWT_SECRET: str = ""
    JWT_ALGORITHM: str = "HS256"
    HOST: str = "localhost"
    PORT: int = 8000

    DEFAULT_REPORT_LOCALE: str = "ru_RU"
    DEFAULT_REPORT_TIMEZONE: str = "Europe/Moscow"

    class Config:
        env_file = ".env-reporting"
        env_file_encoding = "utf-8"


settings = Settings()
