python3 -c "
import sqlite3, json
con = sqlite3.connect('/opt/naville/pocketbase/pb_data/data.db')
cur = con.cursor()
cur.execute('SELECT chave, typeof(dados), length(dados), dados FROM sistema_estado_global')
rows = cur.fetchall()
for r in rows:
    print('Key:', r[0], 'Type:', r[1], 'Len:', r[2])
    val = r[3]
    if isinstance(val, (bytes, bytearray)):
        print('Bytes preview:', bytes(val[:80]))
        try:
            d = json.loads(val.decode('utf-8'))
            print('Parsed JSON keys:', list(d.keys()))
            print('Invoices:', len(d.get('invoices', [])))
        except Exception as e:
            print('JSON error:', e)
    elif isinstance(val, str):
        print('String preview:', val[:80])
        try:
            d = json.loads(val)
            print('Parsed JSON keys:', list(d.keys()))
            print('Invoices:', len(d.get('invoices', [])))
        except Exception as e:
            print('JSON error:', e)
"
