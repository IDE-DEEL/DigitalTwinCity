from databasePoller import Database
from dbConfig import DB_CONFIG

with Database(DB_CONFIG) as db:
    row = db.fetch_one("SELECT * FROM test WHERE id = %s", (1,))
    print(row)