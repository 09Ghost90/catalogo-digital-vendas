import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

const STOCK_STORAGE_KEY = 'admin_stock_by_product';

export const LOW_STOCK_THRESHOLD = 5;

function getKey(categoria: string, id: number): string {
  return `${categoria}::${id}`;
}

function parseStockKey(key: string): { categoria: string; id: number | null } {
  const separator = key.lastIndexOf('::');
  if (separator === -1) return { categoria: key, id: null };
  const categoria = key.slice(0, separator);
  const idRaw = key.slice(separator + 2);
  const id = Number.parseInt(idRaw, 10);
  return { categoria, id: Number.isNaN(id) ? null : id };
}

export function useStockManager() {
  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  const [remoteStockAvailable, setRemoteStockAvailable] = useState<boolean | null>(null);

  const syncFromSupabase = useCallback(async () => {
    if (remoteStockAvailable === false) return;

    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, categoria, estoque');

      if (error) {
        if ((error as any).code === '42703') {
          setRemoteStockAvailable(false);
          console.warn('Coluna products.estoque ausente no Supabase. Aplicar migration para sincronizar entre dispositivos.');
          return;
        }
        throw error;
      }
      setRemoteStockAvailable(true);

      const remoteMap: Record<string, number> = {};
      (data || []).forEach((row: any) => {
        const qty = Number.isFinite(Number(row.estoque)) ? Math.max(0, Math.floor(Number(row.estoque))) : 0;
        remoteMap[getKey(String(row.categoria || ''), Number(row.id))] = qty;
      });

      setStockMap(remoteMap);
      localStorage.setItem(STOCK_STORAGE_KEY, JSON.stringify(remoteMap));
    } catch (error) {
      console.error('Erro ao sincronizar estoque do Supabase:', error);
    }
  }, [remoteStockAvailable]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STOCK_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, number>;
        setStockMap(parsed || {});
      }
    } catch {
      setStockMap({});
    }

    void syncFromSupabase();
  }, [syncFromSupabase]);

  useEffect(() => {
    const onFocus = () => {
      void syncFromSupabase();
    };

    window.addEventListener('focus', onFocus);
    const interval = window.setInterval(() => {
      void syncFromSupabase();
    }, 15000);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearInterval(interval);
    };
  }, [syncFromSupabase]);

  const persist = useCallback((next: Record<string, number>) => {
    setStockMap(next);
    localStorage.setItem(STOCK_STORAGE_KEY, JSON.stringify(next));
  }, []);

  const getStock = useCallback(
    (categoria: string, id: number): number => {
      const value = stockMap[getKey(categoria, id)];
      return typeof value === 'number' ? value : 0;
    },
    [stockMap]
  );

  const setStock = useCallback(
    (categoria: string, id: number, quantity: number) => {
      const safeQty = Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 0;
      const key = getKey(categoria, id);
      const next = { ...stockMap, [key]: safeQty };
      persist(next);

      if (remoteStockAvailable !== true) return;

      void supabase
        .from('products')
        .update({ estoque: safeQty })
        .eq('id', id)
        .then(({ error }) => {
          if (error) {
            if ((error as any).code === '42703') {
              setRemoteStockAvailable(false);
              console.warn('Coluna products.estoque ausente no Supabase. Aplicar migration para sincronizar entre dispositivos.');
              return;
            }
            console.error('Erro ao atualizar estoque no Supabase:', error);
          }
        });
    },
    [stockMap, persist, remoteStockAvailable]
  );

  const remapCategory = useCallback(
    (fromCategory: string, toCategory: string) => {
      const from = fromCategory.trim().toLowerCase();
      const to = toCategory.trim();
      if (!from || !to) return;

      const next = { ...stockMap };
      Object.entries(stockMap).forEach(([key, quantity]) => {
        const parsed = parseStockKey(key);
        if (parsed.id === null) return;
        if (parsed.categoria.trim().toLowerCase() !== from) return;

        delete next[key];
        next[getKey(to, parsed.id)] = quantity;
      });

      persist(next);
    },
    [stockMap, persist]
  );

  const clearCategory = useCallback(
    (category: string) => {
      const normalized = category.trim().toLowerCase();
      if (!normalized) return;

      const next = { ...stockMap };
      Object.keys(stockMap).forEach((key) => {
        const parsed = parseStockKey(key);
        if (parsed.categoria.trim().toLowerCase() === normalized) {
          delete next[key];
        }
      });

      persist(next);
    },
    [stockMap, persist]
  );

  const isLowStock = useCallback(
    (categoria: string, id: number) => getStock(categoria, id) <= LOW_STOCK_THRESHOLD,
    [getStock]
  );

  const lowStockCount = useMemo(
    () => Object.values(stockMap).filter((qty) => qty <= LOW_STOCK_THRESHOLD).length,
    [stockMap]
  );

  return {
    stockMap,
    lowStockCount,
    getStock,
    setStock,
    remapCategory,
    clearCategory,
    isLowStock,
  };
}
