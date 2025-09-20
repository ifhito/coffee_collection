from typing import Optional, Any
from .settings import settings

try:
    import psycopg  # type: ignore
    _HAS_PSYCOPG3 = True
except Exception:
    _HAS_PSYCOPG3 = False
    psycopg = None  # type: ignore

if not _HAS_PSYCOPG3:
    try:
        import psycopg2  # type: ignore
        import psycopg2.extras  # type: ignore
    except Exception as e:  # pragma: no cover
        raise RuntimeError(
            "Neither psycopg(3) nor psycopg2 is installed. Please `pip install psycopg[binary]` or `pip install psycopg2-binary`."
        ) from e


_pool: Optional[Any] = None


def get_conn() -> Any:
    global _pool
    if _pool is None:
        if _HAS_PSYCOPG3:
            _pool = psycopg.connect(  # type: ignore
                host=settings.db_host,
                port=settings.db_port,
                dbname=settings.db_name,
                user=settings.db_user,
                password=settings.db_password,
                autocommit=True,
            )
        else:
            _pool = psycopg2.connect(  # type: ignore
                host=settings.db_host,
                port=settings.db_port,
                dbname=settings.db_name,
                user=settings.db_user,
                password=settings.db_password,
                cursor_factory=psycopg2.extras.RealDictCursor,  # type: ignore
            )
            _pool.autocommit = True
    return _pool


def apply_schema():
    conn = get_conn()
    with conn.cursor() as cur:
        # Create extension and tables (align vector dim with schema.sql default 1024)
        cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
    # Run schema.sql file to ensure full schema
    import os
    p = os.path.join(os.path.dirname(os.path.dirname(__file__)), "db", "schema.sql")
    with open(p, "r", encoding="utf-8") as f:
        sql = f.read()
    with conn.cursor() as cur:
        cur.execute(sql)


def close_conn():
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None
