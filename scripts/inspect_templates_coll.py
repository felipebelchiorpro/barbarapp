import sqlite3
import json

con = sqlite3.connect('/opt/naville/pocketbase/pb_data/data.db')
cur = con.cursor()
row = cur.execute("SELECT * FROM _collections WHERE name = 'templates_mensagens'").fetchone()
cols = [d[0] for d in cur.description]
d = dict(zip(cols, row))
print(json.dumps(d, indent=2))
