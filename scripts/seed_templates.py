import sqlite3
import json

conn = sqlite3.connect("/opt/naville/pocketbase/pb_data/data.db")
cur = conn.cursor()

tables = [r[0] for r in cur.execute("SELECT name FROM _collections").fetchall()]
print("Collections in DB:", tables)

barbearias = cur.execute("SELECT id, name, slug FROM barbearias").fetchall()
print("Barbearias found:", barbearias)

# If templates_mensagens exists, verify or insert
if "templates_mensagens" in tables:
    existing = cur.execute("SELECT id, barbearia_id, tipo_evento FROM templates_mensagens").fetchall()
    print("Existing templates:", existing)
    
    # If empty, seed default templates for each barbearia
    if len(existing) == 0 and len(barbearias) > 0:
        import time, random, string
        def gen_id():
            chars = string.ascii_lowercase + string.digits
            return ''.join(random.choice(chars) for _ in range(15))
        
        default_templates = [
            (
                "confirmacao_agendamento",
                "Fala {nome_cliente}, tudo bem? 💈 Vi aqui que você acabou de marcar o seu horário com a gente!\n\n📅 Data: {data} às {horario}\n✂️ Serviço: {servico} com {barbeiro}\n\n{beneficio_clube}\n\nTe esperamos aqui! Se precisar remarcar, só nos avisar por aqui.",
                35,
                1,
                1
            ),
            (
                "lembrete_2h",
                "Fala {nome_cliente}! ⏰ Passando pra lembrar do seu horário daqui a pouco na barbearia!\n\n📅 Horário: {horario} hoje\n✂️ Serviço: {servico} com {barbeiro}\n\nEstamos preparando tudo para te receber! Se tiver algum imprevisto, avisa a gente por aqui.",
                25,
                1,
                1
            ),
            (
                "reativacao_cliente",
                "Fala {nome_cliente}, sumido! 💈 Já faz um tempo desde o seu último corte com {barbeiro}.\n\nQue tal dar aquele talento no visual essa semana?\n\n{beneficio_clube}\n\nResponda essa mensagem para agendar o seu horário!",
                40,
                1,
                1
            )
        ]
        
        for b in barbearias:
            b_id = b[0]
            for tipo, conteudo, delay, simular, ativo in default_templates:
                rec_id = gen_id()
                cur.execute(
                    "INSERT INTO templates_mensagens (id, barbearia_id, tipo_evento, conteudo, delay_segundos, simular_digitando, ativo) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (rec_id, b_id, tipo, conteudo, delay, simular, ativo)
                )
        conn.commit()
        print("Templates seeded successfully!")
        
        updated = cur.execute("SELECT id, barbearia_id, tipo_evento FROM templates_mensagens").fetchall()
        print("Updated templates:", updated)
