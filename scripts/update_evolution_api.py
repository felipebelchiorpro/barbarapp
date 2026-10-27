import re

file_path = "src/services/evolutionApi.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace cleanBaseUrl
old_clean = """function cleanBaseUrl(url: string): string {
  return (url || '').trim().replace(/\\/+$/, '');
}"""

new_clean = """function cleanBaseUrl(url: string): string {
  const cleaned = (url || '').trim().replace(/\\/+$/, '');
  if (!cleaned || cleaned.includes('evolution-api') || cleaned.includes('localhost:8080') || cleaned.includes('127.0.0.1:8080')) {
    return '';
  }
  return cleaned;
}"""

content = content.replace(old_clean.replace('\r\n', '\n'), new_clean)
content = content.replace(old_clean.replace('\n', '\r\n'), new_clean)

# Replace all occurrences of isDirectEvolution
content = re.sub(
    r"const isDirectEvolution = baseUrl && \(baseUrl\.includes\(':8080'\) \|\| baseUrl\.includes\('whatsapp\.naville\.app'\)\);",
    "const isDirectEvolution = Boolean(baseUrl && !baseUrl.includes('evolution-api') && !baseUrl.includes('localhost') && (baseUrl.startsWith('http://') || baseUrl.startsWith('https://')) && baseUrl.includes('whatsapp.naville.app'));",
    content
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated evolutionApi.ts successfully")
