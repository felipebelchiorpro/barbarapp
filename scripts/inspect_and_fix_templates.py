import sqlite3

con = sqlite3.connect('/opt/naville/pocketbase/pb_data/data.db')
cur = con.cursor()

rows = cur.execute('SELECT id, barbearia_id, tipo_evento, conteudo FROM templates_mensagens').fetchall()
print(f"Total templates found: {len(rows)}")

corrections = {
    " Fala Gabriel": "Fala {nome_cliente}",
    "voc??": "você",
    "hor??rio": "horário",
    "??s": "às",
    "Servi??o": "Serviço",
    "s??": "só",
    "???? Data:": "📅 Data:",
    "?????? Servi??o:": "✂️ Serviço:",
    "?????? Servico:": "✂️ Serviço:",
    "????": "💈",
    "??": "💈",
}

for r in rows:
    tid, bid, tipo, conteudo = r
    print(f"\n[ID: {tid}] Barbearia: {bid} | Tipo: {tipo}")
    print(f"CURRENT CONTENT:\n{conteudo}")
    
    # Check if there are corrupted characters like '??'
    if "??" in conteudo or "????" in conteudo:
        print(">>> Corrupted '??' detected!")
        # Let's see what needs fixing
        new_conteudo = conteudo
        # Common replacement pattern
        new_conteudo = new_conteudo.replace("???? Vi", "💈 Vi")
        new_conteudo = new_conteudo.replace("voc??", "você")
        new_conteudo = new_conteudo.replace("hor??rio", "horário")
        new_conteudo = new_conteudo.replace("??s", "às")
        new_conteudo = new_conteudo.replace("?????? Servi??o:", "✂️ Serviço:")
        new_conteudo = new_conteudo.replace("?????? Serviço:", "✂️ Serviço:")
        new_conteudo = new_conteudo.replace("Servi??o", "Serviço")
        new_conteudo = new_conteudo.replace("???? Data:", "📅 Data:")
        new_conteudo = new_conteudo.replace("s?? nos avisar", "só nos avisar")
        new_conteudo = new_conteudo.replace("s??", "só")
        new_conteudo = new_conteudo.replace("n??o", "não")
        new_conteudo = new_conteudo.replace("est??", "está")
        new_conteudo = new_conteudo.replace("amanh??", "amanhã")
        new_conteudo = new_conteudo.replace("Amanh??", "Amanhã")
        new_conteudo = new_conteudo.replace("ol??", "olá")
        new_conteudo = new_conteudo.replace("Ol??", "Olá")
        new_conteudo = new_conteudo.replace("at??", "até")
        new_conteudo = new_conteudo.replace("j??", "já")
        
        # Clean up any leftover ????
        new_conteudo = new_conteudo.replace("????", "💈")
        
        print(f"PROPOSED FIX:\n{new_conteudo}")
        cur.execute("UPDATE templates_mensagens SET conteudo = ? WHERE id = ?", (new_conteudo, tid))

con.commit()
print("\n=== COMMITTED CHANGES ===")

# Verify all rows now
rows2 = cur.execute('SELECT id, barbearia_id, tipo_evento, conteudo FROM templates_mensagens').fetchall()
for r in rows2:
    print(f"\n[VERIFIED ID: {r[0]}] {r[2]}:\n{r[3]}")
