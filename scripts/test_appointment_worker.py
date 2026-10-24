import sqlite3
import requests
import json
import time

conn = sqlite3.connect("/opt/naville/pocketbase/pb_data/data.db")
cur = conn.cursor()

# 1. Check or create barber and service
barbers = cur.execute("SELECT id, barbearia_id, nome FROM barbeiros").fetchall()
services = cur.execute("SELECT id, barbearia_id, nome FROM servicos").fetchall()
print("Barbers in DB:", barbers)
print("Services in DB:", services)

barbearia_id = "kd2eakh5cijm61x"

if not barbers:
    import random, string
    def gen_id():
        return ''.join(random.choice(string.ascii_lowercase + string.digits) for _ in range(15))
    barber_id = gen_id()
    cur.execute("INSERT INTO barbeiros (id, barbearia_id, nome, telefone, taxa_comissao, ativo) VALUES (?, ?, ?, ?, ?, ?)",
                (barber_id, barbearia_id, "Carlos Silva", "11999998888", 50, 1))
    conn.commit()
    print("Created barber:", barber_id)
else:
    barber_id = barbers[0][0]
    barbearia_id = barbers[0][1]

if not services:
    import random, string
    def gen_id():
        return ''.join(random.choice(string.ascii_lowercase + string.digits) for _ in range(15))
    service_id = gen_id()
    cur.execute("INSERT INTO servicos (id, barbearia_id, nome, preco, duracao_minutos, ativo) VALUES (?, ?, ?, ?, ?, ?)",
                (service_id, barbearia_id, "Corte Degradê Navalhado", 45.0, 30, 1))
    conn.commit()
    print("Created service:", service_id)
else:
    service_id = services[0][0]

BASE_URL = "http://172.28.0.4:8090"

# 2. Get superuser token
r_auth = requests.post(f"{BASE_URL}/api/collections/_superusers/auth-with-password", json={
    "identity": "admin@naville.com",
    "password": "AdminNaville2026!"
})
token = r_auth.json().get("token")
print("Admin token obtained:", bool(token))

# 3. Configure delay to 10s for fast verification
requests.post(f"{BASE_URL}/api/barbearia/whatsapp/templates", json={
    "barbearia_id": barbearia_id,
    "tipo_evento": "confirmacao_agendamento",
    "conteudo": "Fala {nome_cliente}, tudo bem? 💈 Vi aqui que você acabou de marcar o seu horário com a gente!\n\n📅 Data: {data} às {horario}\n✂️ Serviço: {servico} com {barbeiro}\n\n{beneficio_clube}\n\nTe esperamos aqui! Se precisar remarcar, só nos avisar por aqui.",
    "delay_segundos": 10,
    "simular_digitando": True,
    "ativo": True
})

# 4. Post appointment
headers = {"Authorization": token, "Content-Type": "application/json"}
appointment_payload = {
    "barbearia_id": barbearia_id,
    "barbeiro_id": barber_id,
    "cliente_nome": "Lucas Ferreira",
    "cliente_telefone": "11988887777",
    "servicos_ids": [service_id],
    "data": "2026-10-25",
    "horario": "16:00",
    "duracao_total_minutos": 45,
    "valor_total": 60.0,
    "status": "confirmado"
}

r_create = requests.post(f"{BASE_URL}/api/collections/agendamentos/records", headers=headers, json=appointment_payload)
print("Create Appointment response:", r_create.status_code, r_create.text[:150])

print("Waiting 16 seconds for Anti-Ban worker (delay 10s + simulated typing 4s + dispatch)...")
time.sleep(16)

# 5. Check audit log in historico_mensagens_whatsapp
r_history = requests.get(f"{BASE_URL}/api/barbearia/whatsapp/history?barbearia_id={barbearia_id}")
history = r_history.json().get("history", [])
print(f"\nAudit records found ({len(history)} total):")
for h in history[:2]:
    print(f" - ID: {h['id']}")
    print(f"   Cliente: {h['cliente_nome']} ({h['cliente_telefone']})")
    print(f"   Evento: {h['tipo_evento']} | Status: {h['status']}")
    print(f"   Delay: {h['delay_aplicado']}s | Digitando: {h['simulou_digitando']}")
    print(f"   Mensagem:\n{h['mensagem']}\n")

# Restore default delay to 35s
requests.post(f"{BASE_URL}/api/barbearia/whatsapp/templates", json={
    "barbearia_id": barbearia_id,
    "tipo_evento": "confirmacao_agendamento",
    "conteudo": "Fala {nome_cliente}, tudo bem? 💈 Vi aqui que você acabou de marcar o seu horário com a gente!\n\n📅 Data: {data} às {horario}\n✂️ Serviço: {servico} com {barbeiro}\n\n{beneficio_clube}\n\nTe esperamos aqui! Se precisar remarcar, só nos avisar por aqui.",
    "delay_segundos": 35,
    "simular_digitando": True,
    "ativo": True
})
print("Restored default delay to 35s.")
