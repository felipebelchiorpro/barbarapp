import sqlite3

con = sqlite3.connect('/opt/naville/pocketbase/pb_data/data.db')
cur = con.cursor()

# Update kd2eakh5cijm61x to use naville_barbearia_barbearia_ls
cur.execute("""
    UPDATE barbearias 
    SET evolution_instance_name = 'naville_barbearia_barbearia_ls',
        whatsapp_status = 'open',
        whatsapp_phone = '5519999005677'
    WHERE id = 'kd2eakh5cijm61x'
""")
con.commit()

print("UPDATED ROWS:", cur.rowcount)
row = cur.execute("SELECT id, name, evolution_instance_name, whatsapp_status, whatsapp_phone FROM barbearias WHERE id = 'kd2eakh5cijm61x'").fetchone()
print("UPDATED RECORD:", row)
