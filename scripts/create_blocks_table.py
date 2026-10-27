import sqlite3

con = sqlite3.connect('/opt/naville/pocketbase/pb_data/data.db')
cur = con.cursor()

cur.execute("""
CREATE TABLE IF NOT EXISTS bloqueios_horarios (
    id TEXT PRIMARY KEY,
    barbearia_id TEXT NOT NULL,
    barber_id TEXT NOT NULL,
    data TEXT NOT NULL,
    hora_inicio TEXT NOT NULL,
    hora_fim TEXT NOT NULL,
    motivo TEXT NOT NULL,
    created TEXT NOT NULL
)
""")
cur.execute("CREATE INDEX IF NOT EXISTS idx_bloqueios_barbearia ON bloqueios_horarios(barbearia_id, data)")
con.commit()

# Verify
cols = [r[1] for r in cur.execute("PRAGMA table_info(bloqueios_horarios)").fetchall()]
print("TABLE OK! COLUMNS:", cols)
