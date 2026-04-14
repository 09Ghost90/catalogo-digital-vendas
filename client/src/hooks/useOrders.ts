import { useCallback, useEffect, useMemo, useState } from 'react';

const ORDERS_STORAGE_KEY = 'admin_orders';
const ORDER_SEQUENCE_STORAGE_KEY = 'admin_order_sequence_by_date';

export type OrderStatus = 'pendente' | 'concluido';

export interface AdminOrderItem {
  productId: number;
  nome: string;
  categoria: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

export interface AdminOrder {
  code: string;
  createdAt: string;
  customerNome: string;
  customerTelefone: string;
  customerEndereco: string;
  total: number;
  status: OrderStatus;
  items: AdminOrderItem[];
}

interface CreateOrderPayload {
  customerNome: string;
  customerTelefone: string;
  customerEndereco: string;
  items: AdminOrderItem[];
  total: number;
}

function formatDateCode(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function generateOrderCode(): string {
  const today = formatDateCode(new Date());

  let seqMap: Record<string, number> = {};
  try {
    seqMap = JSON.parse(localStorage.getItem(ORDER_SEQUENCE_STORAGE_KEY) || '{}') as Record<string, number>;
  } catch {
    seqMap = {};
  }

  const nextSequence = (seqMap[today] || 0) + 1;
  seqMap[today] = nextSequence;
  localStorage.setItem(ORDER_SEQUENCE_STORAGE_KEY, JSON.stringify(seqMap));

  return `PED-${today}-${String(nextSequence).padStart(4, '0')}`;
}

export function useOrders() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as AdminOrder[];
      setOrders(parsed || []);
    } catch {
      setOrders([]);
    }
  }, []);

  const persist = useCallback((next: AdminOrder[]) => {
    setOrders(next);
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(next));
  }, []);

  const createOrder = useCallback(
    (payload: CreateOrderPayload): AdminOrder => {
      const newOrder: AdminOrder = {
        code: generateOrderCode(),
        createdAt: new Date().toISOString(),
        customerNome: payload.customerNome.trim(),
        customerTelefone: payload.customerTelefone.trim(),
        customerEndereco: payload.customerEndereco.trim(),
        total: payload.total,
        status: 'pendente',
        items: payload.items,
      };

      const next = [newOrder, ...orders];
      persist(next);
      return newOrder;
    },
    [orders, persist]
  );

  const updateStatus = useCallback(
    (orderCode: string, status: OrderStatus) => {
      const next = orders.map((order) =>
        order.code === orderCode ? { ...order, status } : order
      );
      persist(next);
    },
    [orders, persist]
  );

  const removeOrder = useCallback(
    (orderCode: string) => {
      const next = orders.filter((order) => order.code !== orderCode);
      persist(next);
    },
    [orders, persist]
  );

  const sortedOrders = useMemo(
    () => [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [orders]
  );

  return {
    orders: sortedOrders,
    createOrder,
    updateStatus,
    removeOrder,
  };
}
