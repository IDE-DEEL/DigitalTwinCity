import psycopg

try:
    with psycopg.connect(
        host="localhost",
        user="admin",
        password="x", #This obviously isn't the actual password
        dbname="dt_project",
        sslmode="require",
        connect_timeout=5,
    ) as conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT version();")
            print("Connected to the database successfully!")
            print(cursor.fetchone())

            # Execute a command: this creates a new table
            cursor.execute("""
                           CREATE TABLE test
                           (
                               id   serial PRIMARY KEY,
                               num  integer,
                               data text
                           )
                           """)

            # Pass data to fill a query placeholders and let Psycopg perform
            # the correct conversion (no SQL injections!)
            cursor.execute(
                "INSERT INTO test (num, data) VALUES (%s, %s)",
                (100, "abc'def"))

            # Query the database and obtain data as Python objects.
            cursor.execute("SELECT * FROM test")
            print(cursor.fetchone())
            # will print (1, 100, "abc'def")

            # You can use `cursor.executemany()` to perform an operation in batch
            cursor.executemany(
                "INSERT INTO test (num) values (%s)",
                [(33,), (66,), (99,)])

            # You can use `cursor.fetchmany()`, `cursor.fetchall()` to return a list
            # of several records, or even iterate on the cursor
            cursor.execute("SELECT id, num FROM test order by num")
            for record in cursor:
                print(record)

            # Make the changes to the database persistent
            conn.commit()

except Exception as e:
    print("An error occurred while connecting to the database:")
    print(repr(e))

