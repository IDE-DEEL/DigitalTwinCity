from __future__ import annotations

import logging
from contextlib import contextmanager
from dataclasses import dataclass, field
from typing import Any, Generator, Sequence

import psycopg
from psycopg import Connection, Cursor

# Create a logger for this module
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

@dataclass
class DatabaseConfig:
    """
    Holds database connection settings.
    """

    host: str = "localhost"
    port: int = 5432
    user: str = "postgres"
    password: str = "x"
    dbname: str = "dt_project"
    sslmode: str = "require"
    connect_timeout: int = 5
    options: dict[str, Any] = field(default_factory=dict)

    def to_conninfo(self) -> dict[str, Any]:
        """
        Convert the configuration into a dictionary
        suitable for psycopg.connect().
        """
        base = {
            "host": self.host,
            "port": self.port,
            "user": self.user,
            "password": self.password,
            "dbname": self.dbname,
            "sslmode": self.sslmode,
            "connect_timeout": self.connect_timeout,
        }
        # Merge any additional options
        base.update(self.options)
        return base


# ---------------------------------------------------------------------------
# Core database class
# ---------------------------------------------------------------------------

class Database:
    """
    A lightweight wrapper around a psycopg PostgreSQL connection.
    Provides convenience methods for executing queries and managing transactions.
    """

    def __init__(self, config: DatabaseConfig, autocommit: bool = False) -> None:
        self._config = config
        self._autocommit = autocommit
        self._conn: Connection | None = None

    def connect(self) -> "Database":
        """
        Establish a database connection if not already connected.
        Automatically called when entering a context manager.
        """
        if self._conn is None or self._conn.closed:
            logger.debug(
                "Connecting to %s@%s/%s",
                self._config.user, self._config.host, self._config.dbname
            )
            self._conn = psycopg.connect(**self._config.to_conninfo())

            # Enable autocommit if requested
            if self._autocommit:
                self._conn.autocommit = True

            logger.info("Connected to PostgreSQL %s", self.server_version())
        return self

    def disconnect(self) -> None:
        """
        Close the database connection.
        """
        if self._conn and not self._conn.closed:
            self._conn.close()
            logger.debug("Connection closed.")
        self._conn = None

    @property
    def connection(self) -> Connection:
        """
        Return the active connection.
        Raises an error if no connection is available.
        """
        if self._conn is None or self._conn.closed:
            raise RuntimeError("No active database connection. Call connect() first.")
        return self._conn

    # ------------------------------------------------------------------
    # Context manager support (with statement)
    # ------------------------------------------------------------------

    def __enter__(self) -> "Database":
        """
        Enter context: open connection.
        """
        return self.connect()

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        """
        Exit context:
        - Commit if no exception occurred
        - Roll back if an exception occurred
        - Always close the connection
        """
        if exc_type is None:
            self.commit()
        else:
            self.rollback()
        self.disconnect()

    def commit(self) -> None:
        """
        Commit the current transaction.
        """
        self.connection.commit()
        logger.debug("Transaction committed.")

    def rollback(self) -> None:
        """
        Roll back the current transaction.
        """
        self.connection.rollback()
        logger.debug("Transaction rolled back.")

    @contextmanager
    def transaction(self) -> Generator[None, None, None]:
        """
        Context manager for a transaction block.

        Example:
            with db.transaction():
                db.execute(...)
        """
        with self.connection.transaction():
            yield

    def execute(
        self,
        query: str,
        params: Sequence[Any] | None = None,
    ) -> Cursor:
        """
        Execute a single SQL query and return the cursor.
        """
        cursor = self.connection.cursor()
        cursor.execute(query, params)
        logger.debug("Executed: %s | params: %s", query.strip()[:80], params)
        return cursor

    def executemany(
        self,
        query: str,
        params_seq: Sequence[Sequence[Any]],
    ) -> None:
        """
        Execute the same query multiple times with different parameters.
        """
        with self.connection.cursor() as cursor:
            cursor.executemany(query, params_seq)
        logger.debug("executemany: %d rows processed.", len(params_seq))

    def fetch_one(
        self,
        query: str,
        params: Sequence[Any] | None = None,
    ) -> tuple[Any, ...] | None:
        """
        Execute a query and return a single row.
        """
        cursor = self.execute(query, params)
        return cursor.fetchone()

    def fetch_all(
        self,
        query: str,
        params: Sequence[Any] | None = None,
    ) -> list[tuple[Any, ...]]:
        """
        Execute a query and return all rows.
        """
        cursor = self.execute(query, params)
        return cursor.fetchall()

    def fetch_many(
        self,
        query: str,
        params: Sequence[Any] | None = None,
        size: int = 100,
    ) -> list[tuple[Any, ...]]:
        """
        Execute a query and return a limited number of rows.
        """
        cursor = self.execute(query, params)
        return cursor.fetchmany(size)

    def iter_rows(
        self,
        query: str,
        params: Sequence[Any] | None = None,
    ) -> Generator[tuple[Any, ...], None, None]:
        """
        Execute a query and yield rows one by one (memory efficient).
        """
        cursor = self.execute(query, params)
        yield from cursor

    def server_version(self) -> str:
        """
        Retrieve the PostgreSQL server version.
        """
        row = self.fetch_one("SELECT version();")
        return row[0] if row else "unknown"

    def table_exists(self, table_name: str, schema: str = "public") -> bool:
        """
        Check if a table exists in the given schema.
        """
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
        """
        Execute a CREATE TABLE statement (expects IF NOT EXISTS in DDL).
        """
        self.execute(ddl)

    def __repr__(self) -> str:
        """
        String representation showing connection status.
        """
        status = "connected" if (self._conn and not self._conn.closed) else "not connected"
        return (
            f"Database(host={self._config.host!r}, "
            f"dbname={self._config.dbname!r}, status={status})"
        )


# ---------------------------------------------------------------------------
# Example usage
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    # Configure logging output
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    # Create database configuration
    config = DatabaseConfig(
        host="localhost",
        user="admin",
        password="x",
        dbname="dt_project",
    )

    # Use the database with a context manager
    with Database(config) as db:
        # Print server version
        print("Server version:", db.server_version())

        # Create table if it doesn't exist
        db.execute("""
            CREATE TABLE IF NOT EXISTS test (
                id   serial PRIMARY KEY,
                num  integer,
                data text
            )
        """)

        # Insert a single row
        db.execute(
            "INSERT INTO test (num, data) VALUES (%s, %s)",
            (100, "abc'def"),
        )

        # Fetch and print first row
        print("First row:", db.fetch_one("SELECT * FROM test"))

        # Insert multiple rows
        db.executemany(
            "INSERT INTO test (num) VALUES (%s)",
            [(33,), (66,), (99,)],
        )

        # Iterate over rows
        print("All rows (id, num):")
        for row in db.iter_rows("SELECT id, num FROM test ORDER BY num"):
            print(" ", row)