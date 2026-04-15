import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Produto, CatalogData } from './useCatalog';

const AUTH_KEY = 'admin_auth_token';

interface AdminAuthPayload {
  role: 'admin';
  authenticatedAt: string;
}

function readAuthPayload(): AdminAuthPayload | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminAuthPayload;
    if (parsed?.role === 'admin') return parsed;
    return null;
  } catch {
    return null;
  }
}

// Credentials
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'Armarinho2025!';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!readAuthPayload();
  });

  const login = useCallback((username: string, password: string): boolean => {
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      const payload: AdminAuthPayload = {
        role: 'admin',
        authenticatedAt: new Date().toISOString(),
      };
      localStorage.setItem(AUTH_KEY, JSON.stringify(payload));
      setIsAuthenticated(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY);
    setIsAuthenticated(false);
  }, []);

  return { isAuthenticated, login, logout };
}

type CategoryActionResult = {
  success: boolean;
  error?: string;
};

type DeleteCategoryOptions = {
  categoryName: string;
  strategy: 'unlink' | 'move';
  targetCategory?: string;
};

function normalizeCategoryName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function equalsCategory(a: string, b: string): boolean {
  return normalizeCategoryName(a).toLowerCase() === normalizeCategoryName(b).toLowerCase();
}

/**
 * Supabase-backed product manager.
 * All CRUD operations go directly to the cloud database.
 */
export function useProductManager() {
  const [loading, setLoading] = useState(false);

  const fetchAllCategoryNames = useCallback(async (): Promise<string[]> => {
    const [productsRes, categoryImagesRes] = await Promise.all([
      supabase.from('products').select('categoria'),
      supabase.from('category_images').select('categoria'),
    ]);

    if (productsRes.error) throw productsRes.error;
    if (categoryImagesRes.error) throw categoryImagesRes.error;

    const names = new Set<string>();
    (productsRes.data || []).forEach((row: any) => {
      const name = normalizeCategoryName(String(row.categoria || ''));
      if (name) names.add(name);
    });
    (categoryImagesRes.data || []).forEach((row: any) => {
      const name = normalizeCategoryName(String(row.categoria || ''));
      if (name) names.add(name);
    });

    return Array.from(names);
  }, []);

  const createCategory = useCallback(async (name: string, imageUrl: string): Promise<CategoryActionResult> => {
    setLoading(true);
    try {
      const categoryName = normalizeCategoryName(name);
      if (!categoryName) {
        return { success: false, error: 'Nome da categoria é obrigatório.' };
      }

      const image = imageUrl?.trim();
      if (!image) {
        return { success: false, error: 'Imagem da categoria é obrigatória.' };
      }

      const existing = await fetchAllCategoryNames();
      if (existing.some((item) => equalsCategory(item, categoryName))) {
        return { success: false, error: 'Já existe uma categoria com este nome.' };
      }

      const { error } = await supabase
        .from('category_images')
        .insert({ categoria: categoryName, image_url: image });

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.error('Erro ao criar categoria:', err);
      return { success: false, error: err?.message || 'Erro ao criar categoria.' };
    } finally {
      setLoading(false);
    }
  }, [fetchAllCategoryNames]);

  const updateCategory = useCallback(async (
    oldName: string,
    nextName: string,
    imageUrl?: string
  ): Promise<CategoryActionResult> => {
    setLoading(true);
    try {
      const fromCategory = normalizeCategoryName(oldName);
      const toCategory = normalizeCategoryName(nextName);

      if (!fromCategory || !toCategory) {
        return { success: false, error: 'Nome da categoria é obrigatório.' };
      }

      const existing = await fetchAllCategoryNames();
      const targetExists = existing.some(
        (item) => !equalsCategory(item, fromCategory) && equalsCategory(item, toCategory)
      );
      if (targetExists) {
        return { success: false, error: 'Já existe uma categoria com este nome.' };
      }

      if (!equalsCategory(fromCategory, toCategory)) {
        const { error: moveProductsError } = await supabase
          .from('products')
          .update({ categoria: toCategory })
          .eq('categoria', fromCategory);
        if (moveProductsError) throw moveProductsError;
      }

      const { data: fromCategoryImage, error: fromCategoryImageError } = await supabase
        .from('category_images')
        .select('image_url')
        .eq('categoria', fromCategory)
        .maybeSingle();
      if (fromCategoryImageError) throw fromCategoryImageError;

      const finalImage = imageUrl?.trim() || fromCategoryImage?.image_url || '';

      if (finalImage) {
        const { error: upsertCategoryImageError } = await supabase
          .from('category_images')
          .upsert({ categoria: toCategory, image_url: finalImage });
        if (upsertCategoryImageError) throw upsertCategoryImageError;
      }

      if (!equalsCategory(fromCategory, toCategory)) {
        const { error: deleteOldCategoryImageError } = await supabase
          .from('category_images')
          .delete()
          .eq('categoria', fromCategory);
        if (deleteOldCategoryImageError) throw deleteOldCategoryImageError;
      }

      return { success: true };
    } catch (err: any) {
      console.error('Erro ao atualizar categoria:', err);
      return { success: false, error: err?.message || 'Erro ao atualizar categoria.' };
    } finally {
      setLoading(false);
    }
  }, [fetchAllCategoryNames]);

  const deleteCategory = useCallback(async (options: DeleteCategoryOptions): Promise<CategoryActionResult> => {
    setLoading(true);
    try {
      const categoryName = normalizeCategoryName(options.categoryName);
      if (!categoryName) {
        return { success: false, error: 'Categoria inválida.' };
      }

      const { data: linkedProducts, error: linkedProductsError } = await supabase
        .from('products')
        .select('id')
        .eq('categoria', categoryName);
      if (linkedProductsError) throw linkedProductsError;

      const linkedCount = (linkedProducts || []).length;
      if (linkedCount > 0) {
        if (options.strategy === 'move') {
          const targetCategory = normalizeCategoryName(options.targetCategory || '');
          if (!targetCategory) {
            return { success: false, error: 'Selecione uma categoria de destino.' };
          }
          if (equalsCategory(targetCategory, categoryName)) {
            return { success: false, error: 'A categoria de destino deve ser diferente.' };
          }

          const { error: moveProductsError } = await supabase
            .from('products')
            .update({ categoria: targetCategory })
            .eq('categoria', categoryName);
          if (moveProductsError) throw moveProductsError;
        } else {
          const fallbackCategory = 'Sem categoria';
          const { error: unlinkProductsError } = await supabase
            .from('products')
            .update({ categoria: fallbackCategory })
            .eq('categoria', categoryName);
          if (unlinkProductsError) throw unlinkProductsError;
        }
      }

      const { error: deleteCategoryImageError } = await supabase
        .from('category_images')
        .delete()
        .eq('categoria', categoryName);
      if (deleteCategoryImageError) throw deleteCategoryImageError;

      return { success: true };
    } catch (err: any) {
      console.error('Erro ao excluir categoria:', err);
      return { success: false, error: err?.message || 'Erro ao excluir categoria.' };
    } finally {
      setLoading(false);
    }
  }, []);

  const addProduct = useCallback(async (
    product: Omit<Produto, 'id'>,
    newCategoryImage?: string
  ): Promise<Produto | null> => {
    setLoading(true);
    try {
      // Insert the product
      const { data, error } = await supabase
        .from('products')
        .insert({
          nome: product.nome,
          nome_completo: product.nome_completo,
          categoria: product.categoria,
          preco_unitario: product.preco_unitario,
          preco_embalagem: product.preco_embalagem,
          unidade: product.unidade,
          icon: product.icon || 'Package',
          imagens: product.imagens || [],
        })
        .select()
        .single();

      if (error) throw error;

      // If there is a new category image, upsert it
      if (newCategoryImage) {
        await supabase
          .from('category_images')
          .upsert({ categoria: product.categoria, image_url: newCategoryImage });
      }

      return data as Produto;
    } catch (err: any) {
      console.error('Erro ao adicionar produto:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const removeProduct = useCallback(async (id: number): Promise<boolean> => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (err: any) {
      console.error('Erro ao remover produto:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProduct = useCallback(async (
    id: number,
    updates: Partial<Produto>,
    newCategoryImage?: string
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const updatePayload: any = {};
      if (updates.nome !== undefined) updatePayload.nome = updates.nome;
      if (updates.nome_completo !== undefined) updatePayload.nome_completo = updates.nome_completo;
      if (updates.categoria !== undefined) updatePayload.categoria = updates.categoria;
      if (updates.preco_unitario !== undefined) updatePayload.preco_unitario = updates.preco_unitario;
      if (updates.preco_embalagem !== undefined) updatePayload.preco_embalagem = updates.preco_embalagem;
      if (updates.unidade !== undefined) updatePayload.unidade = updates.unidade;
      if (updates.imagens !== undefined) updatePayload.imagens = updates.imagens;

      const { error } = await supabase
        .from('products')
        .update(updatePayload)
        .eq('id', id);

      if (error) throw error;

      // If there is a new category image, upsert it
      if (newCategoryImage && updates.categoria) {
        await supabase
          .from('category_images')
          .upsert({ categoria: updates.categoria, image_url: newCategoryImage });
      }

      return true;
    } catch (err: any) {
      console.error('Erro ao atualizar produto:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Upload an image file to Supabase Storage and return a public URL.
   */
  const uploadImage = useCallback(async (file: File, folder: string = 'products'): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

      const { error: uploadError } = await supabase
        .storage
        .from('images')
        .upload(fileName, file, { contentType: file.type, upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase
        .storage
        .from('images')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (err: any) {
      console.error('Erro ao fazer upload da imagem:', err);
      return null;
    }
  }, []);

  return {
    loading,
    addProduct,
    removeProduct,
    updateProduct,
    createCategory,
    updateCategory,
    deleteCategory,
    uploadImage,
  };
}
