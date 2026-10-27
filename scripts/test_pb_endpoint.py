import urllib.request
import json

url = "http://172.28.0.4:8090/api/barbearia/whatsapp/test-send"
payload = {
    "barbearia_id": "kd2eakh5cijm61x",
    "telefone": "19998277880",
    "tipo_evento": "confirmacao_agendamento",
    "simular_digitando": True
}
data = json.dumps(payload).encode("utf-8")
req = urllib.request.Request(
    url,
    data=data,
    headers={"Content-Type": "application/json"}
)

try:
    with urllib.request.urlopen(req) as resp:
        print("PB TEST-SEND SUCCESS:", resp.getcode(), resp.read().decode())
except urllib.error.HTTPError as e:
    print("PB TEST-SEND HTTPError:", e.code, e.read().decode())
except Exception as ex:
    print("PB TEST-SEND Error:", ex)
