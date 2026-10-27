import sqlite3
import json
import time

con = sqlite3.connect('/opt/naville/pocketbase/pb_data/data.db')
cur = con.cursor()

# Ensure table has all columns
cols = [r[1] for r in cur.execute("PRAGMA table_info(bloqueios_horarios)").fetchall()]
print("Current columns:", cols)

if "updated" not in cols:
    cur.execute("ALTER TABLE bloqueios_horarios ADD COLUMN updated TEXT DEFAULT ''")
    con.commit()

# Check if already in _collections
exists = cur.execute("SELECT id FROM _collections WHERE name = 'bloqueios_horarios'").fetchone()

if not exists:
    fields = [
        {"autogeneratePattern":"[a-z0-9]{15}","help":"","hidden":False,"id":"text3208210256","max":15,"min":15,"name":"id","pattern":"^[a-z0-9]+$","presentable":False,"primaryKey":True,"required":True,"system":True,"type":"text"},
        {"autogeneratePattern":"","help":"","hidden":False,"id":"text3545718203","max":0,"min":0,"name":"barbearia_id","pattern":"","presentable":False,"primaryKey":False,"required":True,"system":False,"type":"text"},
        {"autogeneratePattern":"","help":"","hidden":False,"id":"text2661533894","max":0,"min":0,"name":"barber_id","pattern":"","presentable":False,"primaryKey":False,"required":True,"system":False,"type":"text"},
        {"autogeneratePattern":"","help":"","hidden":False,"id":"text2918445923","max":0,"min":0,"name":"data","pattern":"","presentable":False,"primaryKey":False,"required":True,"system":False,"type":"text"},
        {"autogeneratePattern":"","help":"","hidden":False,"id":"text3797439395","max":0,"min":0,"name":"hora_inicio","pattern":"","presentable":False,"primaryKey":False,"required":True,"system":False,"type":"text"},
        {"autogeneratePattern":"","help":"","hidden":False,"id":"text3797439396","max":0,"min":0,"name":"hora_fim","pattern":"","presentable":False,"primaryKey":False,"required":True,"system":False,"type":"text"},
        {"autogeneratePattern":"","help":"","hidden":False,"id":"text2514242599","max":0,"min":0,"name":"motivo","pattern":"","presentable":False,"primaryKey":False,"required":False,"system":False,"type":"text"},
        {"autogeneratePattern":"","help":"","hidden":False,"id":"autodate2990389176","name":"created","onCreate":True,"onUpdate":False,"presentable":False,"system":False,"type":"autodate"},
        {"autogeneratePattern":"","help":"","hidden":False,"id":"autodate3332085495","name":"updated","onCreate":True,"onUpdate":True,"presentable":False,"system":False,"type":"autodate"}
    ]
    
    now_str = time.strftime('%Y-%m-%d %H:%M:%S.000Z')
    cur.execute("""
        INSERT INTO _collections (id, system, type, name, fields, indexes, listRule, viewRule, createRule, updateRule, deleteRule, options, created, updated)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        'pbc_9988776655',
        0,
        'base',
        'bloqueios_horarios',
        json.dumps(fields),
        '[]',
        '', # Public list
        '', # Public view
        '', # Public create
        '', # Public update
        '', # Public delete
        '{}',
        now_str,
        now_str
    ))
    con.commit()
    print("Registered bloqueios_horarios in _collections successfully!")
else:
    print("bloqueios_horarios already in _collections:", exists[0])
