import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Get credentials from args or env
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://cyndrewvgegsxyloihng.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5bmRyZXd2Z2Vnc3h5bG9paG5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMjg0NDEsImV4cCI6MjA5MTcwNDQ0MX0.ApppQPQ8opZ5jtB_lU9PPlnHZ8qzcNKjVLDwJBGpiqw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function migrate() {
  console.log('Iniciando migração para o Supabase...');

  // Read local JSON file
  const jsonPath = path.resolve(__dirname, '../produtos.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('produtos.json não encontrado na raiz!');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  // 1. Insert Store Info
  console.log('Salvando dados da loja...');
  const { error: storeError } = await supabase
    .from('store_info')
    .upsert({ id: 1, empresa: data.empresa, whatsapp: data.whatsapp });

  if (storeError) {
    console.error('Erro ao inserir store_info:', storeError);
  } else {
    console.log('Dados da loja salvos!');
  }

  // 2. Insert Category Images
  console.log('Salvando imagens de categoria...');
  for (const [categoria, image_url] of Object.entries(data.categoryImages)) {
    const { error: catError } = await supabase
      .from('category_images')
      .upsert({ categoria, image_url: image_url as string });
    if (catError) console.error(`Erro ao inserir categoria ${categoria}:`, catError);
  }
  console.log('Imagens de categoria salvas!');

  // 3. Insert Products
  console.log('Salvando produtos (isso pode demorar os primeiros segundos)...');
  let productCount = 0;

  for (const [categoria, produtos] of Object.entries(data.categorias)) {
    const productsToInsert = (produtos as any[]).map(p => ({
      nome: p.nome,
      nome_completo: p.nome_completo,
      categoria: p.categoria,
      preco_unitario: p.preco_unitario,
      preco_embalagem: p.preco_embalagem,
      unidade: p.unidade,
      icon: p.icon || 'Package',
      imagens: p.imagens || []
    }));

    if (productsToInsert.length > 0) {
      const { error: prodError } = await supabase
        .from('products')
        .insert(productsToInsert);

      if (prodError) {
        console.error(`Erro ao inserir produtos na categoria ${categoria}:`, prodError);
      } else {
        productCount += productsToInsert.length;
      }
    }
  }

  console.log(`\n🎉 Migração completada com sucesso! ${productCount} produtos importados para o Supabase.`);
}

migrate().catch(err => console.error('Erro na migração:', err));
