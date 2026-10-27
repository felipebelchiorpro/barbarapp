import urllib.request
import urllib.error
import json

url = "https://navillebarber.pro/api/collections/bloqueios_horarios/records"
payload = {
    "barbearia_id": "kd2eakh5cijm61x",
    "barber_id": "barber-carlos",
    "data": "2026-10-26",
    "hora_inicio": "14:00",
    "hora_fim": "15:30",
    "motivo": "Intervalo de Almoço / Pausa"
}

req = urllib.request.Request(
    url,
    data=json.dumps(payload).encode('utf-8'),
    headers={
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0"
    }
)

try:
    resp = urllib.request.urlopen(req)
    print("SUCCESS:", resp.read().decode())
except urllib.error.HTTPError as err:
    print("ERROR:", err.code, err.read().decode())
