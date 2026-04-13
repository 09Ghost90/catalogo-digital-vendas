import { useState, useCallback } from 'react';

interface Produto {
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

interface CatalogData {
  empresa: string;
  whatsapp: string;
  categoryImages: Record<string, string>;
  categorias: Record<string, Produto[]>;
}

const AUTH_KEY = 'admin_auth_token';
const PRODUCTS_KEY = 'admin_products_override';

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

export function useProductManager(baseCatalog: CatalogData) {
  const [catalog, setCatalog] = useState<CatalogData>(() => {
    const saved = localStorage.getItem(PRODUCTS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return baseCatalog;
      }
    }
    return baseCatalog;
  });

  const saveCatalog = useCallback((newCatalog: CatalogData) => {
    setCatalog(newCatalog);
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(newCatalog));
  }, []);

  const addProduct = useCallback((product: Omit<Produto, 'id'>) => {
    const newCatalog = { ...catalog };
    const categoria = product.categoria;

    if (!newCatalog.categorias[categoria]) {
      newCatalog.categorias[categoria] = [];
    }

    // Generate next ID
    const allProducts = Object.values(newCatalog.categorias).flat();
    const maxId = allProducts.length > 0 ? Math.max(...allProducts.map(p => p.id)) : 0;

    const newProduct: Produto = {
      ...product,
      id: maxId + 1,
      icon: 'Package',
    };

    newCatalog.categorias[categoria] = [...newCatalog.categorias[categoria], newProduct];
    saveCatalog(newCatalog);
    return newProduct;
  }, [catalog, saveCatalog]);

  const removeProduct = useCallback((categoria: string, id: number) => {
    const newCatalog = { ...catalog };
    if (newCatalog.categorias[categoria]) {
      newCatalog.categorias[categoria] = newCatalog.categorias[categoria].filter(p => p.id !== id);
      if (newCatalog.categorias[categoria].length === 0) {
        delete newCatalog.categorias[categoria];
      }
    }
    saveCatalog(newCatalog);
  }, [catalog, saveCatalog]);

  const updateProduct = useCallback((categoria: string, id: number, updates: Partial<Produto>) => {
    const newCatalog = { ...catalog };
    if (newCatalog.categorias[categoria]) {
      newCatalog.categorias[categoria] = newCatalog.categorias[categoria].map(p =>
        p.id === id ? { ...p, ...updates } : p
      );
    }
    saveCatalog(newCatalog);
  }, [catalog, saveCatalog]);

  const resetToDefault = useCallback(() => {
    localStorage.removeItem(PRODUCTS_KEY);
    setCatalog(baseCatalog);
  }, [baseCatalog]);

  const getAllProducts = useCallback((): Produto[] => {
    return Object.values(catalog.categorias).flat();
  }, [catalog]);

  const getCategories = useCallback((): string[] => {
    return Object.keys(catalog.categorias).sort();
  }, [catalog]);

  return {
    catalog,
    addProduct,
    removeProduct,
    updateProduct,
    resetToDefault,
    getAllProducts,
    getCategories,
  };
}
