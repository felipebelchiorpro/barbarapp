import sqlite3
import json

con = sqlite3.connect('/opt/naville/pocketbase/pb_data/data.db')
cur = con.cursor()

row = cur.execute("SELECT id, name, type, fields, listRule, viewRule, createRule, updateRule, deleteRule FROM _collections WHERE name = 'agendamentos'").fetchone()
if row:
    print("NAME:", row[1])
    print("FIELDS:", row[3])
    print("RULES:", row[4], row[5], row[6], row[7], row[8])
else:
    print("agendamentos not found")
