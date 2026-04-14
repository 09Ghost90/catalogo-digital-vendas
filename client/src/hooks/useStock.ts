import { useCallback, useEffect, useMemo, useState } from 'react';

const STOCK_STORAGE_KEY = 'admin_stock_by_product';

export const LOW_STOCK_THRESHOLD = 5;

function getKey(categoria: string, id: number): string {
  return `${categoria}::${id}`;
}

export function useStockManager() {
  const [stockMap, setStockMap] = useState<Record<string, number>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STOCK_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, number>;
      setStockMap(parsed || {});
    } catch {
      setStockMap({});
    }
  }, []);

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
    isLowStock,
  };
}
