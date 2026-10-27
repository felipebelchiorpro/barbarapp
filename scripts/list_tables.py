import sqlite3

con = sqlite3.connect('/opt/naville/pocketbase/pb_data/data.db')
cur = con.cursor()
collections = [r[0] for r in cur.execute("SELECT name FROM _collections").fetchall()]
print("COLLECTIONS:", collections)
