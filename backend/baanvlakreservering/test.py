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
# Read function (RFID)
# ---------------------------------------------------------------------------

def read_rfid(db: Database, car_id: str) -> str | None:
    """
    Fetch the most recent RFID tag scanned by a given car.
    Returns the RFID tag or None if no records exist.
    """
    row = db.fetch_one(
        """
        SELECT rfid_tag
        FROM car_logs
        WHERE car_id = %s
        ORDER BY created_at DESC
        LIMIT 1
        """,
        (car_id,),
    )

    if row is None:
        return None

    (rfid_tag,) = row
    return rfid_tag


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
# Write function (set car command)
# ---------------------------------------------------------------------------

def set_car_command(db: Database, car_id: str, direction: int, allowed_to_drive: bool) -> None:
    """
    Insert or update the command for a given car.
    """
    db.execute(
        """
        INSERT INTO car_commands (car_id, direction, allowed_to_drive, updated_at)
        VALUES (%s, %s, %s, CURRENT_TIMESTAMP)
        ON CONFLICT (car_id)
        DO UPDATE SET
            direction = EXCLUDED.direction,
            allowed_to_drive = EXCLUDED.allowed_to_drive,
            updated_at = CURRENT_TIMESTAMP
        """,
        (car_id, direction, allowed_to_drive),
    )


# ---------------------------------------------------------------------------
# Main usage
# ---------------------------------------------------------------------------

with Database(DB_CONFIG) as db:
    # Ensure tables exist
    create_tables(db)

    # Log an RFID scan (write example)
    log_car_rfid(db, car_id="car_1", rfid_tag="TAG8")

    rfid = read_rfid(db, "car_1")
    print("Latest RFID:", rfid)

    # Set command for a car
    set_car_command(db, car_id="car_1", direction=2, allowed_to_drive=False)

    # Read command for a carTrue
    result = get_car_command(db, car_id="car_1")

    # Print result
    if result is None:
        print("No command found for this car.")
    else:
        direction, allowed = result
        print(f"Direction: {direction}, Allowed to drive: {allowed}")