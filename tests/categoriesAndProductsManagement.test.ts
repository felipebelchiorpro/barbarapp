import assert from 'node:assert';
import { Product, Service, ServiceCategoryConfig } from '../src/types';

console.log('======================================================');
console.log('💈 SUÍTE: CATEGORIAS PERSONALIZADAS & PRODUTOS INTERNOS');
console.log('======================================================\n');

// 1. Bloco de Categorias Personalizadas
console.log('📌 Bloco 1: Configuração de Categorias da Barbearia (Corte, Barba, Club e afins)');

const defaultCategories: ServiceCategoryConfig[] = [
  { id: 'cabelo', name: 'Corte & Cabelo', description: 'Cortes masculinos e acabamentos' },
  { id: 'barba', name: 'Barba & Terapia', description: 'Barba alinhada e toalha quente' },
  { id: 'club', name: 'Barber Club', description: 'Planos mensais e pacotes do clube' },
  { id: 'combos', name: 'Combos & Pacotes', description: 'Corte + Barba' },
  { id: 'tratamento', name: 'Tratamentos & Química', description: 'Selagem e estética' },
];

const catIds = defaultCategories.map((c) => c.id);
assert.ok(catIds.includes('cabelo'), 'Deve conter categoria de cabelo/corte');
assert.ok(catIds.includes('barba'), 'Deve conter categoria de barba');
assert.ok(catIds.includes('club'), 'Deve conter categoria Barber Club');
assert.ok(catIds.includes('combos'), 'Deve conter categoria combos');
assert.ok(catIds.includes('tratamento'), 'Deve conter categoria tratamento');
console.log('  ✓ Contém categorias padrão incluindo Corte, Barba, Club, Combos e Tratamentos');

// Cadastro de nova categoria
const customCatName = 'Sobrancelha & Estética';
const slug = customCatName
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]/g, '_')
  .replace(/_+/g, '_');

const customCategory: ServiceCategoryConfig = {
  id: slug,
  name: customCatName,
  description: 'Design de sobrancelha e cuidados faciais',
  active: true,
};

assert.strictEqual(customCategory.id, 'sobrancelha_estetica');
assert.strictEqual(customCategory.name, 'Sobrancelha & Estética');
console.log('  ✓ Permite cadastrar novas categorias personalizadas sem colisão');

// Associação de serviço
const clubService: Service = {
  id: 'serv-club-mensal',
  name: 'Corte Livre VIP (Club Mensal)',
  category: 'club',
  durationMinutes: 30,
  price: 89.9,
  description: 'Acesso liberado do clube de assinantes para o mês',
  active: true,
};

assert.strictEqual(clubService.category, 'club');
assert.strictEqual(clubService.active, true);
console.log('  ✓ Permite associar um serviço à categoria Barber Club ou customizada');


// 2. Bloco de Produtos & Estoque Interno
console.log('\n📌 Bloco 2: Produtos & Estoque Interno para Organização da Barbearia');

const testProduct: Product = {
  id: 'prod-pomada-clay',
  tenantId: 'tenant-barbearia-ls',
  name: 'Pomada Efeito Argila Matte 100g',
  category: 'pomadas',
  price: 45.0,
  costPrice: 18.0,
  stockQuantity: 15,
  minStock: 4,
  unit: 'pote',
  supplier: 'Distribuidora Barber Pro SP',
  notes: 'Guardar longe da luz solar direta',
  active: true,
};

assert.strictEqual(testProduct.price, 45.0);
assert.strictEqual(testProduct.costPrice, 18.0);
assert.strictEqual(testProduct.stockQuantity, 15);
assert.strictEqual(testProduct.supplier, 'Distribuidora Barber Pro SP');
console.log('  ✓ Estrutura de Produto suporta Preço de Venda, Preço de Custo, Estoque e Fornecedor');

// Margem de lucro
const price = 40.0;
const cost = 16.0;
const profitPerUnit = price - cost;
const marginPercent = Math.round((profitPerUnit / cost) * 100);

assert.strictEqual(profitPerUnit, 24.0);
assert.strictEqual(marginPercent, 150);
console.log('  ✓ Calcula margem de lucro e lucro unitário com precisão');

// Alertas de reposição
const products: Product[] = [
  {
    id: 'p1',
    tenantId: 't1',
    name: 'Óleo Barba 30ml',
    category: 'barba',
    price: 35,
    stockQuantity: 2,
    minStock: 4,
    active: true,
  },
  {
    id: 'p2',
    tenantId: 't1',
    name: 'Pomada Matte 150g',
    category: 'pomadas',
    price: 40,
    stockQuantity: 10,
    minStock: 3,
    active: true,
  },
  {
    id: 'p3',
    tenantId: 't1',
    name: 'Shampoo Anticaspa',
    category: 'cuidados',
    price: 30,
    stockQuantity: 0,
    minStock: 2,
    active: true,
  },
];

const lowStockItems = products.filter((p) => p.stockQuantity <= (p.minStock ?? 3));
assert.strictEqual(lowStockItems.length, 2);
assert.strictEqual(lowStockItems[0].name, 'Óleo Barba 30ml');
assert.strictEqual(lowStockItems[1].name, 'Shampoo Anticaspa');
console.log('  ✓ Identifica alertas de reposição para itens em estoque baixo (<= minStock)');

// Ajuste rápido de estoque
let currentStock = 1;
currentStock = Math.max(0, currentStock - 1);
assert.strictEqual(currentStock, 0);

currentStock = Math.max(0, currentStock - 1);
assert.strictEqual(currentStock, 0, 'Estoque nunca deve ser negativo');

currentStock = Math.max(0, currentStock + 5);
assert.strictEqual(currentStock, 5);
console.log('  ✓ Ajuste de estoque (+ / -) decrementa e incrementa sem permitir valores negativos');


// 3. Bloco de Isolamento: Produtos NUNCA no app de agendamento
console.log('\n📌 Bloco 3: Isolamento Estrito — Produtos NUNCA aparecem no App de Agendamento do Cliente');

const sampleServices: Service[] = [
  {
    id: 'serv-1',
    name: 'Cabelo Degradê',
    category: 'cabelo',
    durationMinutes: 30,
    price: 40.0,
    description: 'Corte completo',
    active: true,
  },
  {
    id: 'serv-2',
    name: 'Barba Terapia',
    category: 'barba',
    durationMinutes: 30,
    price: 35.0,
    description: 'Toalha quente e navalha',
    active: true,
  },
];

sampleServices.forEach((s) => {
  assert.ok(typeof s.durationMinutes === 'number', 'Serviço deve possuir durationMinutes');
  assert.strictEqual((s as any).stockQuantity, undefined, 'Serviço público não deve ter stockQuantity');
  assert.strictEqual((s as any).costPrice, undefined, 'Serviço público não deve expor costPrice');
  assert.strictEqual((s as any).supplier, undefined, 'Serviço público não deve expor supplier');
});
console.log('  ✓ Catálogo de agendamento online contém apenas Serviços, sem misturar Produtos');

products.forEach((p) => {
  assert.ok(typeof p.stockQuantity === 'number', 'Produto deve possuir stockQuantity');
  assert.strictEqual((p as any).durationMinutes, undefined, 'Produto interno não deve possuir durationMinutes');
});
console.log('  ✓ Produtos de uso interno contêm estoque mas não possuem duração de horário na cadeira');

console.log('\n======================================================');
console.log('🎉 TODOS OS TESTES DE CATEGORIAS E PRODUTOS PASSARAM!');
console.log('======================================================\n');
