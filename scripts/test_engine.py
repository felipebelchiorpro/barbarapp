import requests
import json

BASE_URL = "http://172.28.0.4:8090"
EVO_URL = "http://172.28.0.6:8080"
EVO_KEY = "4f89d3a1b72e5c9f0861ab4e3c7d92f15082e6da19743c5b8df2194a860eb3c1"
BARBEARIA_ID = "kd2eakh5cijm61x"
INSTANCE_NAME = f"naville_barbearia_{BARBEARIA_ID}"

# 1. Ensure instance exists in Evolution API
headers = {"Content-Type": "application/json", "apikey": EVO_KEY}
r_evo = requests.post(f"{EVO_URL}/instance/create", headers=headers, json={
    "instanceName": INSTANCE_NAME,
    "integration": "WHATSAPP-BAILEYS",
    "token": "tokennavillebarber1234567890123456",
    "webhook": {
        "url": "http://pocketbase:8090/api/webhooks/evolution",
        "byEvents": False,
        "events": ["CONNECTION_UPDATE", "MESSAGES_UPSERT"]
    }
})
print("Create Evo instance:", r_evo.status_code, r_evo.text[:100])

# 2. Test-send again
payload_test = {
    "barbearia_id": BARBEARIA_ID,
    "telefone": "5511999999999",
    "tipo_evento": "confirmacao_agendamento",
    "simular_digitando": False
}
r_test = requests.post(f"{BASE_URL}/api/barbearia/whatsapp/test-send", json=payload_test)
print("Test-send status after instance created:", r_test.status_code)
print("Test-send response:", r_test.text[:200])

# 3. Check history
r_hist = requests.get(f"{BASE_URL}/api/barbearia/whatsapp/history?barbearia_id={BARBEARIA_ID}")
history = r_hist.json().get("history", [])
print(f"Total audit logs recorded: {len(history)}")
for h in history[:3]:
    print(f" - Log: {h['id']} | Cliente: {h['cliente_nome']} | Status: {h['status']}")
