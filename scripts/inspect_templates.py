import sqlite3

con = sqlite3.connect('/opt/naville/pocketbase/pb_data/data.db')
cur = con.cursor()
rows = cur.execute('SELECT id, barbearia_id, tipo_evento, conteudo FROM templates_mensagens').fetchall()
for r in rows:
    print(f"ID: {r[0]} | Barbearia: {r[1]} | Evento: {r[2]}")
    print(f"   Conteudo: {repr(r[3])}\n")
