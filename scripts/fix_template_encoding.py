import sqlite3

con = sqlite3.connect('/opt/naville/pocketbase/pb_data/data.db')
cur = con.cursor()

# 1. Update the corrupted template to clean UTF-8
cur.execute("""
    UPDATE templates_mensagens
    SET conteudo = 'Fala {nome_cliente}, tudo bem? 💈 Vi aqui que você acabou de marcar o seu horário com a gente!\n\n📅 Data: {data} às {horario}\n✂️ Serviço: {servico} com {barbeiro}\n\n{beneficio_clube}\n\nTe esperamos aqui! Se precisar remarcar, só nos avisar por aqui.'
    WHERE id = '4hump2vzgeutdso'
""")
con.commit()
print("UPDATED TEMPLATES:", cur.rowcount)

# Verify
row = cur.execute("SELECT id, barbearia_id, tipo_evento, conteudo FROM templates_mensagens WHERE id = '4hump2vzgeutdso'").fetchone()
print("VERIFIED:", row[2], repr(row[3]))
