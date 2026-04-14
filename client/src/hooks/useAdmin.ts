import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Produto, CatalogData } from './useCatalog';

const AUTH_KEY = 'admin_auth_token';

// Credentials
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'Armarinho2025!';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem(AUTH_KEY) === 'authenticated';
  });

  const login = useCallback((username: string, password: string): boolean => {
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      localStorage.setItem(AUTH_KEY, 'authenticated');
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

/**
 * Supabase-backed product manager.
 * All CRUD operations go directly to the cloud database.
 */
export function useProductManager() {
  const [loading, setLoading] = useState(false);

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
    uploadImage,
  };
}
