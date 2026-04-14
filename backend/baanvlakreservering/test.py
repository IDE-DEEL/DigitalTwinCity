from databasePoller import Database
from dbConfig import DB_CONFIG

# ---------------------------------------------------------------------------
# Table setup
# ---------------------------------------------------------------------------

def create_tables(db: Database) -> None:
    db.execute("""
        CREATE TABLE IF NOT EXISTS car_logs (
            id SERIAL PRIMARY KEY,
            car_id TEXT,
            rfid_tag TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    db.execute("""
        CREATE TABLE IF NOT EXISTS car_commands (
            car_id TEXT PRIMARY KEY,
            direction INTEGER,
            allowed_to_drive BOOLEAN,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)


# ---------------------------------------------------------------------------
# Write function (RFID logging)
# ---------------------------------------------------------------------------

def log_car_rfid(db: Database, car_id: str, rfid_tag: str) -> None:
    """
    Insert a record of which car scanned which RFID tag.
    """
    db.execute(
        """
        INSERT INTO car_logs (car_id, rfid_tag)
        VALUES (%s, %s)
        """,
        (car_id, rfid_tag),
    )


# ---------------------------------------------------------------------------
# Read function (car commands)
# ---------------------------------------------------------------------------

def get_car_command(db: Database, car_id: str) -> tuple[int, bool] | None:
    """
    Fetch the direction and allowed_to_drive flag for a given car.
    Returns (direction, allowed_to_drive) or None if not found.
    """
    row = db.fetch_one(
        """
        SELECT direction, allowed_to_drive
        FROM car_commands
        WHERE car_id = %s
        """,
        (car_id,),
    )

    if row is None:
        return None

    direction, allowed = row
    return direction, allowed


# ---------------------------------------------------------------------------
# Main usage
# ---------------------------------------------------------------------------

with Database(DB_CONFIG) as db:
    # Ensure tables exist
    create_tables(db)

    # Example: log RFID scan
    log_car_rfid(db, "car_1", "RFID_ABC123")

    # Example: read command for car
    command = get_car_command(db, "car_1")

    if command is None:
        print("No command found for this car")
    else:
        direction, allowed = command
        print(f"Direction: {direction}, Allowed to drive: {allowed}")

    # Show recent logs
    print("\nRecent car_logs:")
    rows = db.fetch_all("SELECT * FROM car_logs ORDER BY id DESC LIMIT 5")
    for row in rows:
        print(row)