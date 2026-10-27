import urllib.request
import json

url = "http://172.28.0.6:8080/message/sendText/naville_barbearia_barbearia_ls"
payload = {
    "number": "5519998277880",
    "text": "💈 *Naville Barber* - Olá! Seu WhatsApp foi conectado com sucesso ao sistema e este é o teste real de funcionamento! 🚀✂️"
}
data = json.dumps(payload).encode("utf-8")
req = urllib.request.Request(
    url,
    data=data,
    headers={
        "Content-Type": "application/json",
        "apikey": "4f89d3a1b72e5c9f0861ab4e3c7d92f15082e6da19743c5b8df2194a860eb3c1"
    }
)

try:
    with urllib.request.urlopen(req) as resp:
        print("SUCCESS:", resp.getcode(), resp.read().decode())
except urllib.error.HTTPError as e:
    print("HTTPError:", e.code, e.read().decode())
except Exception as ex:
    print("Error:", ex)
