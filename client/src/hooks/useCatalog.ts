import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface Produto {
  id: number;
  nome: string;
  nome_completo: string;
  categoria: string;
  preco_unitario: number;
  preco_embalagem: number;
  unidade: string;
  icon: string;
  imagens?: string[];
}

export interface CatalogData {
  empresa: string;
  whatsapp: string;
  categoryImages: Record<string, string>;
  categorias: Record<string, Produto[]>;
}

/**
 * Hook that fetches the entire catalog from Supabase and returns it
 * in the same shape the rest of the app expects (CatalogData).
 */
export function useCatalog() {
  const [data, setData] = useState<CatalogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all 3 tables in parallel
      const [storeRes, catImgRes, productsRes] = await Promise.all([
        supabase.from('store_info').select('*').eq('id', 1).single(),
        supabase.from('category_images').select('*'),
        supabase.from('products').select('*').order('nome'),
      ]);

      if (storeRes.error) throw storeRes.error;
      if (catImgRes.error) throw catImgRes.error;
      if (productsRes.error) throw productsRes.error;

      // Build categoryImages map
      const categoryImages: Record<string, string> = {};
      for (const row of catImgRes.data || []) {
        categoryImages[row.categoria] = row.image_url;
      }

      // Group products by category
      const categorias: Record<string, Produto[]> = {};
      for (const row of productsRes.data || []) {
        const cat = row.categoria;
        if (!categorias[cat]) categorias[cat] = [];
        categorias[cat].push({
          id: row.id,
          nome: row.nome,
          nome_completo: row.nome_completo || row.nome,
          categoria: row.categoria,
          preco_unitario: Number(row.preco_unitario),
          preco_embalagem: Number(row.preco_embalagem),
          unidade: row.unidade,
          icon: row.icon || 'Package',
          imagens: row.imagens || [],
        });
      }

      setData({
        empresa: storeRes.data.empresa || 'Armarinhos Pereira',
        whatsapp: storeRes.data.whatsapp || '',
        categoryImages,
        categorias,
      });
    } catch (err: any) {
      console.error('Erro ao carregar catálogo:', err);
      setError(err.message || 'Erro ao carregar catálogo');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  return { data, loading, error, refetch: fetchCatalog };
}
