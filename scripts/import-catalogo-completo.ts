/// <reference types="node" />

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

type FlatCatalogItem = {
  Codigo?: string;
  Unidade?: string;
  Descricao?: string;
  Preco_Unitario?: string | number;
  Preco_A_Vista?: string | number;
  Status?: string | null;
};

type ProductInsert = {
  nome: string;
  nome_completo: string;
  categoria: string;
  preco_unitario: number;
  preco_embalagem: number;
  unidade: string;
  icon: string;
  imagens: string[];
};

const DEFAULT_CATEGORY = 'Outros Produtos';
const INPUT_FILE = path.resolve(process.cwd(), 'catalogo_completo.json');
const LEGACY_PRODUCTS_FILE = path.resolve(process.cwd(), 'produtos.json');
const CATEGORY_STOPWORDS = new Set([
  'de',
  'da',
  'do',
  'das',
  'dos',
  'para',
  'com',
  'sem',
  'em',
  'no',
  'na',
  'nos',
  'nas',
  'e',
  'ou',
  'unid',
  'unidade',
  'pct',
  'cx',
  'ct',
  'dz',
  'mts',
  'mm',
  'cm',
  'ml',
  'lts',
  'n',
  'nro',
  'num',
  'x',
]);

function readFirstEnv(keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

const supabaseUrl = readFirstEnv(['SUPABASE_URL', 'VITE_SUPABASE_URL']);
const supabaseKey = readFirstEnv([
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
  'VITE_SUPABASE_ANON_KEY',
]);

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (preferred) or SUPABASE_ANON_KEY.'
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);
const isDryRun = process.argv.includes('--dry-run');
const shouldAppend = process.argv.includes('--append');
const shouldReplace = !shouldAppend;

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\bc\//g, 'com ')
    .replace(/\bp\//g, 'para ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function extractKeywords(value: string): string[] {
  return normalizeText(value)
    .split(/\s+/)
    .filter(
      (word) =>
        word.length > 2 &&
        !CATEGORY_STOPWORDS.has(word) &&
        !/^\d+$/.test(word)
    );
}

function parseBrazilianNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return 0;

  const normalized = value.replace(/\./g, '').replace(',', '.').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parsePossiblyInvalidJson(filePath: string): any {
  const raw = fs.readFileSync(filePath, 'utf8');

  try {
    return JSON.parse(raw);
  } catch {
    const sanitized = raw.replace(/:\s*NaN\b/g, ': null');
    return JSON.parse(sanitized);
  }
}

function buildLegacyCategoryMaps(): {
  categoryByName: Map<string, string>;
  categoryKeywords: Map<string, Set<string>>;
} {
  const categoryByName = new Map<string, string>();
  const categoryKeywords = new Map<string, Set<string>>();

  if (!fs.existsSync(LEGACY_PRODUCTS_FILE)) {
    return { categoryByName, categoryKeywords };
  }

  const legacyData = parsePossiblyInvalidJson(LEGACY_PRODUCTS_FILE);
  const categories = legacyData?.categorias || {};

  for (const [categoryName, products] of Object.entries(categories)) {
    const keywordSet = categoryKeywords.get(String(categoryName)) || new Set<string>();

    for (const product of products as Array<any>) {
      const fullName = typeof product?.nome_completo === 'string' ? product.nome_completo : '';
      const shortName = typeof product?.nome === 'string' ? product.nome : '';

      const normalizedFull = normalizeText(fullName);
      const normalizedShort = normalizeText(shortName);

      if (normalizedFull) categoryByName.set(normalizedFull, String(categoryName));
      if (normalizedShort) categoryByName.set(normalizedShort, String(categoryName));

      for (const keyword of extractKeywords(fullName || shortName)) {
        keywordSet.add(keyword);
      }
    }

    categoryKeywords.set(String(categoryName), keywordSet);
  }

  return { categoryByName, categoryKeywords };
}

function inferCategoryByKeywords(
  productName: string,
  categoryKeywords: Map<string, Set<string>>
): string | null {
  const keywords = new Set(extractKeywords(productName));
  if (keywords.size === 0) return null;

  let bestCategory: string | null = null;
  let bestScore = 0;
  let tieCount = 0;

  for (const [category, tokenSet] of categoryKeywords.entries()) {
    let score = 0;
    for (const token of keywords) {
      if (tokenSet.has(token)) score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
      tieCount = 1;
    } else if (score > 0 && score === bestScore) {
      tieCount += 1;
    }
  }

  if (bestScore < 1) return null;
  if (tieCount > 1) return null;
  return bestCategory;
}

function toProductInsert(
  item: FlatCatalogItem,
  categoryByName: Map<string, string>,
  categoryKeywords: Map<string, Set<string>>
): ProductInsert | null {
  const nome = String(item.Descricao || '').trim();
  if (!nome) return null;

  const normalizedName = normalizeText(nome);
  const categoria =
    categoryByName.get(normalizedName) ||
    inferCategoryByKeywords(nome, categoryKeywords) ||
    DEFAULT_CATEGORY;

  return {
    nome,
    nome_completo: nome,
    categoria,
    preco_unitario: parseBrazilianNumber(item.Preco_Unitario),
    preco_embalagem: parseBrazilianNumber(item.Preco_A_Vista),
    unidade: String(item.Unidade || 'Unid.').trim() || 'Unid.',
    icon: 'Package',
    imagens: [],
  };
}

async function clearProductsTable() {
  const { error } = await supabase.from('products').delete().neq('id', -1);
  if (error) {
    throw new Error(`Failed to clear products table: ${error.message}`);
  }
}

async function insertInChunks(products: ProductInsert[], chunkSize = 150): Promise<number> {
  let inserted = 0;

  for (let i = 0; i < products.length; i += chunkSize) {
    const chunk = products.slice(i, i + chunkSize);
    const { error } = await supabase.from('products').insert(chunk);

    if (error) {
      throw new Error(`Insert failed at chunk ${Math.floor(i / chunkSize) + 1}: ${error.message}`);
    }

    inserted += chunk.length;
    console.log(`Inserted ${inserted}/${products.length}`);
  }

  return inserted;
}

async function readCurrentCount(): Promise<number> {
  const { count, error } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });

  if (error) {
    throw new Error(`Failed to count products: ${error.message}`);
  }

  return count || 0;
}

async function main() {
  console.log('Starting full catalog import...');
  console.log(`Mode: ${isDryRun ? 'dry-run' : shouldReplace ? 'replace' : 'append'}`);

  if (!fs.existsSync(INPUT_FILE)) {
    throw new Error(`Input file not found: ${INPUT_FILE}`);
  }

  const source = parsePossiblyInvalidJson(INPUT_FILE) as FlatCatalogItem[];
  if (!Array.isArray(source)) {
    throw new Error('catalogo_completo.json must be an array.');
  }

  const { categoryByName, categoryKeywords } = buildLegacyCategoryMaps();
  const mapped = source
    .map((item) => toProductInsert(item, categoryByName, categoryKeywords))
    .filter((item): item is ProductInsert => item !== null);

  console.log(`Source items: ${source.length}`);
  console.log(`Mapped items: ${mapped.length}`);

  const categories = new Set(mapped.map((item) => item.categoria));
  console.log(`Mapped categories: ${categories.size}`);

  const resumoCategorias = mapped.reduce<Record<string, number>>((acc, item) => {
    acc[item.categoria] = (acc[item.categoria] || 0) + 1;
    return acc;
  }, {});
  console.log('Category summary:', resumoCategorias);

  const before = await readCurrentCount();
  console.log(`Products before import: ${before}`);

  if (isDryRun) {
    console.log('Dry-run finished. No data was written to Supabase.');
    return;
  }

  if (shouldReplace) {
    await clearProductsTable();
    console.log('Existing products removed.');
  }

  const inserted = await insertInChunks(mapped);
  const after = await readCurrentCount();

  if (shouldReplace && after !== mapped.length) {
    throw new Error(
      `Post-import count mismatch. Expected ${mapped.length} products, but found ${after}.`
    );
  }

  console.log('Import finished.');
  console.log(`Inserted: ${inserted}`);
  console.log(`Products after import: ${after}`);
}

main().catch((err) => {
  console.error('Import error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
