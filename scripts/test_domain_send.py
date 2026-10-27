import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://navillebarber.pro/api/barbearia/whatsapp/test-send"
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
    headers={
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
)

try:
    with urllib.request.urlopen(req, context=ctx) as resp:
        print("DOMAIN TEST-SEND SUCCESS:", resp.getcode(), resp.read().decode())
except urllib.error.HTTPError as e:
    print("DOMAIN TEST-SEND HTTPError:", e.code, e.read().decode())
except Exception as ex:
    print("DOMAIN TEST-SEND Error:", ex)
