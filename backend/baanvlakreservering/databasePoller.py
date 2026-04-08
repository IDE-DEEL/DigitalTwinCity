from __future__ import annotations

import logging
from contextlib import contextmanager
from dataclasses import dataclass, field
from typing import Any, Generator, Sequence

import psycopg
from psycopg import Connection, Cursor

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

@dataclass
class DatabaseConfig:

    host: str = "localhost"
    port: int = 5432
    user: str = "postgres"
    password: str = "x"
    dbname: str = "dt_project"
    sslmode: str = "require"
    connect_timeout: int = 5
    options: dict[str, Any] = field(default_factory=dict)

    def to_conninfo(self) -> dict[str, Any]:
        base = {
            "host": self.host,
            "port": self.port,
            "user": self.user,
            "password": self.password,
            "dbname": self.dbname,
            "sslmode": self.sslmode,
            "connect_timeout": self.connect_timeout,
        }
        base.update(self.options)
        return base


# ---------------------------------------------------------------------------
# Core database class
# ---------------------------------------------------------------------------

class Database:

    def __init__(self, config: DatabaseConfig, autocommit: bool = False) -> None:
        self._config = config
        self._autocommit = autocommit
        self._conn: Connection | None = None

    def connect(self) -> "Database":
        """Open the connection. Called automatically by __enter__."""
        if self._conn is None or self._conn.closed:
            logger.debug("Connecting to %s@%s/%s",
                         self._config.user, self._config.host, self._config.dbname)
            self._conn = psycopg.connect(**self._config.to_conninfo())
            if self._autocommit:
                self._conn.autocommit = True
            logger.info("Connected to PostgreSQL %s", self.server_version())
        return self

    def disconnect(self) -> None:
        """Close the connection."""
        if self._conn and not self._conn.closed:
            self._conn.close()
            logger.debug("Connection closed.")
        self._conn = None

    @property
    def connection(self) -> Connection:
        if self._conn is None or self._conn.closed:
            raise RuntimeError("No active database connection. Call connect() first.")
        return self._conn

    # ------------------------------------------------------------------
    # Context manager
    # ------------------------------------------------------------------

    def __enter__(self) -> "Database":
        return self.connect()

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        if exc_type is None:
            self.commit()
        else:
            self.rollback()
        self.disconnect()



    def commit(self) -> None:
        """Write changes to the database."""
        self.connection.commit()
        logger.debug("Transaction committed.")

    def rollback(self) -> None:
        """Undo uncommitted changes."""
        self.connection.rollback()
        logger.debug("Transaction rolled back.")

    @contextmanager
    def transaction(self) -> Generator[None, None, None]:

        with self.connection.transaction():
            yield


    def execute(
        self,
        query: str,
        params: Sequence[Any] | None = None,
    ) -> Cursor:

        cursor = self.connection.cursor()
        cursor.execute(query, params)
        logger.debug("Executed: %s | params: %s", query.strip()[:80], params)
        return cursor

    def executemany(
        self,
        query: str,
        params_seq: Sequence[Sequence[Any]],
    ) -> None:

        with self.connection.cursor() as cursor:
            cursor.executemany(query, params_seq)
        logger.debug("executemany: %d rows processed.", len(params_seq))


    def fetch_one(
        self,
        query: str,
        params: Sequence[Any] | None = None,
    ) -> tuple[Any, ...] | None:

        cursor = self.execute(query, params)
        return cursor.fetchone()

    def fetch_all(
        self,
        query: str,
        params: Sequence[Any] | None = None,
    ) -> list[tuple[Any, ...]]:

        cursor = self.execute(query, params)
        return cursor.fetchall()

    def fetch_many(
        self,
        query: str,
        params: Sequence[Any] | None = None,
        size: int = 100,
    ) -> list[tuple[Any, ...]]:

        cursor = self.execute(query, params)
        return cursor.fetchmany(size)

    def iter_rows(
        self,
        query: str,
        params: Sequence[Any] | None = None,
    ) -> Generator[tuple[Any, ...], None, None]:

        cursor = self.execute(query, params)
        yield from cursor

    def server_version(self) -> str:
        row = self.fetch_one("SELECT version();")
        return row[0] if row else "unknown"

    def table_exists(self, table_name: str, schema: str = "public") -> bool:
        row = self.fetch_one(
            """
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = %s AND table_name = %s
            )
            """,
            (schema, table_name),
        )
        return bool(row and row[0])

    def create_table_if_not_exists(self, ddl: str) -> None:

        self.execute(ddl)

    def __repr__(self) -> str:
        status = "connected" if (self._conn and not self._conn.closed) else "not connected"
        return (
            f"Database(host={self._config.host!r}, "
            f"dbname={self._config.dbname!r}, status={status})"
        )

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    config = DatabaseConfig(
        host="localhost",
        user="admin",
        password="x",
        dbname="dt_project",
    )

    with Database(config) as db:
        print("Server version:", db.server_version())

        db.execute("""
            CREATE TABLE IF NOT EXISTS test (
                id   serial PRIMARY KEY,
                num  integer,
                data text
            )
        """)

        db.execute(
            "INSERT INTO test (num, data) VALUES (%s, %s)",
            (100, "abc'def"),
        )

        print("First row:", db.fetch_one("SELECT * FROM test"))

        db.executemany(
            "INSERT INTO test (num) VALUES (%s)",
            [(33,), (66,), (99,)],
        )

        print("All rows (id, num):")
        for row in db.iter_rows("SELECT id, num FROM test ORDER BY num"):
            print(" ", row)
