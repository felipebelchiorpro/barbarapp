/**
 * Parameterized Query & Filter Helper for PocketBase / SQLite
 * Database Optimizer & Application Security Engineer (Naville SaaS)
 * Requisito [7] Prevenção contra SQL/NoSQL Injection
 */

/**
 * Escapa strings literais utilizadas em strings de filtro do PocketBase
 * Impede que aspas, barras e operadores lógicos quebrem o AST do parser do PocketBase
 */
export function escapePbFilterValue(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  const str = String(value);
  // Escapa barras invertidas e aspas duplas
  const escaped = str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escaped}"`;
}

/**
 * Cria expressão de igualdade segura contra injeção: campo = "valor_escapado"
 */
export function buildSafeEqualityFilter(field: string, value: string | number | boolean): string {
  // Valida que o nome do campo contém apenas caracteres alfanuméricos e underscores
  if (!/^[a-zA-Z0-9_.]+$/.test(field)) {
    throw new Error(`Nome de campo inválido para filtro: ${field}`);
  }
  return `${field} = ${escapePbFilterValue(value)}`;
}

/**
 * Combina múltiplos filtros com AND de forma segura
 */
export function buildSafeAndFilter(filters: string[]): string {
  const valid = filters.filter(Boolean);
  if (valid.length === 0) return '';
  if (valid.length === 1) return valid[0];
  return valid.map((f) => `(${f})`).join(' && ');
}
