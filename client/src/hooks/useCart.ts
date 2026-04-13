import { useState, useCallback } from 'react';

export type PaymentMethod = 'pix' | 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'boleto' | '';

export const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'pix', label: 'PIX', icon: '📱' },
  { value: 'dinheiro', label: 'Dinheiro', icon: '💵' },
  { value: 'cartao_credito', label: 'Cartão de Crédito', icon: '💳' },
  { value: 'cartao_debito', label: 'Cartão de Débito', icon: '💳' },
  { value: 'boleto', label: 'Boleto', icon: '📄' },
];

export interface CartItem {
  id: number;
  categoria: string;
  nome: string;
  nome_completo: string;
  preco_unitario: number;
  preco_embalagem: number;
  unidade: string;
  imagens?: string[];
  quantidade: number;
  tipo: 'unitario' | 'embalagem';
}

export interface CartActions {
  items: CartItem[];
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
  addToCart: (product: any) => void;
  removeFromCart: (categoria: string, id: number) => void;
  updateQuantity: (categoria: string, id: number, quantidade: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
  getWhatsAppMessage: () => string;
}

export function useCart(whatsappNumber: string): CartActions {
  const [items, setItems] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('');

  const addToCart = useCallback((product: any) => {
    setItems(prev => {
      const existing = prev.find(
        item => item.id === product.id && item.categoria === product.categoria
      );
      if (existing) {
        return prev.map(item =>
          item.id === product.id && item.categoria === product.categoria
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        );
      }
      return [...prev, {
        id: product.id,
        categoria: product.categoria,
        nome: product.nome,
        nome_completo: product.nome_completo,
        preco_unitario: product.preco_unitario,
        preco_embalagem: product.preco_embalagem,
        unidade: product.unidade,
        imagens: product.imagens,
        quantidade: 1,
        tipo: 'unitario' as const,
      }];
    });
  }, []);

  const removeFromCart = useCallback((categoria: string, id: number) => {
    setItems(prev => prev.filter(
      item => !(item.id === id && item.categoria === categoria)
    ));
  }, []);

  const updateQuantity = useCallback((categoria: string, id: number, quantidade: number) => {
    if (quantidade <= 0) {
      removeFromCart(categoria, id);
      return;
    }
    setItems(prev => prev.map(item =>
      item.id === id && item.categoria === categoria
        ? { ...item, quantidade }
        : item
    ));
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setItems([]);
    setPaymentMethod('');
  }, []);

  const getTotal = useCallback(() => {
    return items.reduce((total, item) => {
      const price = item.tipo === 'embalagem' ? item.preco_embalagem : item.preco_unitario;
      return total + (price * item.quantidade);
    }, 0);
  }, [items]);

  const getItemCount = useCallback(() => {
    return items.reduce((count, item) => count + item.quantidade, 0);
  }, [items]);

  const getWhatsAppMessage = useCallback(() => {
    if (items.length === 0) return '';

    let message = `Olá! Gostaria de fazer o seguinte pedido:\n\n`;

    items.forEach((item, index) => {
      const price = item.tipo === 'embalagem' ? item.preco_embalagem : item.preco_unitario;
      const tipoLabel = item.tipo === 'embalagem' ? 'Embalagem' : 'Unitário';
      message += `*${index + 1}. ${item.nome_completo}*\n`;
      message += `   Qtd: ${item.quantidade} | Tipo: ${tipoLabel}\n`;
      message += `   Preço: R$ ${price.toFixed(2)} cada\n`;
      message += `   Subtotal: R$ ${(price * item.quantidade).toFixed(2)}\n\n`;
    });

    message += `─────────────────\n`;
    message += `*TOTAL DO PEDIDO: R$ ${getTotal().toFixed(2)}*\n`;

    if (paymentMethod) {
      const selected = PAYMENT_OPTIONS.find(o => o.value === paymentMethod);
      if (selected) {
        message += `*PAGAMENTO: ${selected.icon} ${selected.label}*\n`;
      }
    }

    message += `\nAguardo confirmação. Obrigado!`;

    return message;
  }, [items, getTotal, paymentMethod]);

  return {
    items,
    paymentMethod,
    setPaymentMethod,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotal,
    getItemCount,
    getWhatsAppMessage,
  };
}
