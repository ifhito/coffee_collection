import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    db_host: str = os.getenv("DB_HOST", "localhost")
    db_port: int = int(os.getenv("DB_PORT", "5432"))
    db_name: str = os.getenv("DB_NAME", "coffee_rag")
    db_user: str = os.getenv("DB_USER", "postgres")
    db_password: str = os.getenv("DB_PASSWORD", "postgres")

    lambda_api_url: str = os.getenv("LAMBDA_API_URL", "").rstrip("/")
    embedding_dim: int = int(os.getenv("EMBEDDING_DIM", "1024"))
    max_tokens: int = int(os.getenv("MAX_TOKENS", "800"))


settings = Settings()

