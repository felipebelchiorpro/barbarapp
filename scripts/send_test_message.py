import json
import urllib.request
import urllib.error

url = "https://navillebarber.pro/api/barbearia/whatsapp/test-send"
payload = {
    "barbearia_id": "kd2eakh5cijm61x",
    "telefone": "19998277880",
    "tipo_evento": "confirmacao_agendamento",
    "simular_digitando": False
}

data = json.dumps(payload).encode("utf-8")
req = urllib.request.Request(
    url,
    data=data,
    headers={
        "Content-Type": "application/json; charset=utf-8",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
)

try:
    resp = urllib.request.urlopen(req, timeout=30)
    raw = resp.read()
    print("STATUS:", resp.status)
    print("BODY:", raw.decode("utf-8", errors="replace").encode("ascii", "backslashreplace").decode())
except urllib.error.HTTPError as err:
    print("HTTP ERROR:", err.code)
    print("BODY:", err.read().decode("utf-8", errors="replace").encode("ascii", "backslashreplace").decode())
except Exception as ex:
    print("ERROR:", str(ex))
