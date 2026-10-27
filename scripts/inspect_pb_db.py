import sqlite3

con = sqlite3.connect('/opt/naville/pocketbase/pb_data/data.db')
cur = con.cursor()
cols = [c[1] for c in cur.execute('PRAGMA table_info(historico_mensagens_whatsapp)').fetchall()]
rows = cur.execute('SELECT * FROM historico_mensagens_whatsapp').fetchall()
print('HIST COUNT:', len(rows))
for r in rows[-5:]:
    print("HIST ROW:", dict(zip(cols, r)))
