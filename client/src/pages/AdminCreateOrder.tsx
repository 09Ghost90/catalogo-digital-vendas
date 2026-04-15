import { useMemo, useState } from 'react';
import { ArrowLeft, LogOut, Minus, Plus, Search, ShoppingCart } from 'lucide-react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAdmin';
import { useCatalog } from '@/hooks/useCatalog';
import type { Produto } from '@/hooks/useCatalog';
import { useStockManager } from '@/hooks/useStock';
import { useOrders } from '@/hooks/useOrders';
import type { AdminOrderItem } from '@/hooks/useOrders';
import { toast } from 'sonner';

interface SellerCartItem {
  source: 'catalog' | 'manual';
  priceMode: 'unitario' | 'embalagem';
  product: Produto;
  quantity: number;
}

function getSellerItemPrice(item: SellerCartItem): number {
  if (item.priceMode === 'embalagem') {
    return item.product.preco_embalagem || item.product.preco_unitario;
  }
  return item.product.preco_unitario;
}

function formatWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('55') ? digits : `55${digits}`;
}

function buildOrderWhatsAppMessage(order: {
  code: string;
  customerNome: string;
  customerTelefone: string;
  customerEndereco: string;
  items: AdminOrderItem[];
  total: number;
}): string {
  const lines: string[] = [];
  lines.push(`Pedido ${order.code}`);
  lines.push('');
  lines.push('Dados do cliente');
  lines.push(`Nome: ${order.customerNome}`);
  lines.push(`Contato: ${order.customerTelefone}`);
  lines.push(`Endereco: ${order.customerEndereco}`);
  lines.push('');
  lines.push('Itens do pedido');

  order.items.forEach((item, idx) => {
    lines.push(`${idx + 1}. ${item.nome}`);
    lines.push(`Qtd: ${item.quantidade} | Unitario: R$ ${item.precoUnitario.toFixed(2)} | Subtotal: R$ ${item.subtotal.toFixed(2)}`);
  });

  lines.push('');
  lines.push(`Total: R$ ${order.total.toFixed(2)}`);
  return lines.join('\n');
}

export default function AdminCreateOrder() {
  const { isAuthenticated, logout } = useAuth();
  const { data: catalog, loading: catalogLoading } = useCatalog();
  const stock = useStockManager();
  const { createOrder } = useOrders();
  const [, navigate] = useLocation();

  const [sellerSearch, setSellerSearch] = useState('');
  const [sellerCart, setSellerCart] = useState<SellerCartItem[]>([]);
  const [quickProductForm, setQuickProductForm] = useState({
    nome: '',
    descricao: '',
    unidade: 'Un.',
    valorUnitario: '',
    valorEmbalagem: '',
    quantidade: '1',
    priceMode: 'unitario' as 'unitario' | 'embalagem',
  });
  const [customerData, setCustomerData] = useState({ nome: '', telefone: '', endereco: '' });

  const sellerProducts = useMemo(() => {
    if (!catalog) return [];
    const term = sellerSearch.toLowerCase().trim();
    const products = Object.values(catalog.categorias).flat();

    if (!term) return products.slice(0, 60);

    return products
      .filter(
        (p) =>
          p.nome.toLowerCase().includes(term) ||
          p.nome_completo.toLowerCase().includes(term) ||
          p.categoria.toLowerCase().includes(term)
      )
      .slice(0, 60);
  }, [catalog, sellerSearch]);

  const sellerTotal = useMemo(() => {
    return sellerCart.reduce((acc, item) => acc + getSellerItemPrice(item) * item.quantity, 0);
  }, [sellerCart]);

  const quickProductTotal = useMemo(() => {
    const quantidade = Number.parseInt(quickProductForm.quantidade, 10);
    const valorBase = quickProductForm.priceMode === 'embalagem'
      ? Number.parseFloat(quickProductForm.valorEmbalagem)
      : Number.parseFloat(quickProductForm.valorUnitario);

    if (Number.isNaN(quantidade) || quantidade <= 0 || Number.isNaN(valorBase) || valorBase <= 0) {
      return 0;
    }

    return quantidade * valorBase;
  }, [quickProductForm]);

  if (!isAuthenticated) {
    window.location.href = '/login';
    return null;
  }

  if (catalogLoading || !catalog) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Carregando criação de pedido...</p>
        </div>
      </div>
    );
  }

  const addSellerProduct = (product: Produto) => {
    setSellerCart((prev) => {
      const existing = prev.find(
        (item) =>
          item.source === 'catalog' &&
          item.product.id === product.id &&
          item.product.categoria === product.categoria
      );
      if (existing) {
        return prev.map((item) =>
          item.source === 'catalog' && item.product.id === product.id && item.product.categoria === product.categoria
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { source: 'catalog', priceMode: 'unitario', product, quantity: 1 }];
    });
  };

  const addManualProduct = () => {
    const nome = quickProductForm.nome.trim();
    const descricao = quickProductForm.descricao.trim();
    const valorUnitario = Number.parseFloat(quickProductForm.valorUnitario);
    const valorEmbalagem = Number.parseFloat(quickProductForm.valorEmbalagem);
    const quantidade = Number.parseInt(quickProductForm.quantidade, 10);

    if (!nome) {
      toast.error('Informe o nome do produto.');
      return;
    }

    if (Number.isNaN(valorUnitario) || valorUnitario <= 0) {
      toast.error('Informe um valor unitário válido.');
      return;
    }

    if (Number.isNaN(quantidade) || quantidade <= 0) {
      toast.error('Informe uma quantidade válida.');
      return;
    }

    if (quickProductForm.priceMode === 'embalagem' && (Number.isNaN(valorEmbalagem) || valorEmbalagem <= 0)) {
      toast.error('Informe o valor total da embalagem (caixa/dúzia).');
      return;
    }

    const safeValorEmbalagem = Number.isNaN(valorEmbalagem) || valorEmbalagem <= 0
      ? valorUnitario
      : valorEmbalagem;

    const nomeCompleto = descricao ? `${nome} - ${descricao}` : nome;

    const manualProduct: Produto = {
      id: -Math.floor(Date.now() + Math.random() * 1000),
      nome,
      nome_completo: nomeCompleto,
      categoria: 'Item avulso',
      preco_unitario: valorUnitario,
      preco_embalagem: safeValorEmbalagem,
      unidade: quickProductForm.unidade,
      icon: 'Package',
      imagens: [],
    };

    setSellerCart((prev) => [
      ...prev,
      {
        source: 'manual',
        priceMode: quickProductForm.priceMode,
        product: manualProduct,
        quantity: quantidade,
      },
    ]);

    setQuickProductForm({
      nome: '',
      descricao: '',
      unidade: quickProductForm.unidade,
      valorUnitario: '',
      valorEmbalagem: '',
      quantidade: '1',
      priceMode: quickProductForm.priceMode,
    });
    toast.success('Item adicionado ao carrinho.');
  };

  const updateSellerQuantity = (productId: number, categoria: string, quantity: number) => {
    if (quantity <= 0) {
      setSellerCart((prev) => prev.filter((item) => !(item.product.id === productId && item.product.categoria === categoria)));
      return;
    }

    setSellerCart((prev) =>
      prev.map((item) =>
        item.product.id === productId && item.product.categoria === categoria
          ? { ...item, quantity }
          : item
      )
    );
  };

  const handleGenerateOrder = () => {
    if (sellerCart.length === 0) {
      toast.error('Adicione produtos para gerar o pedido.');
      return;
    }

    if (!customerData.nome.trim() || !customerData.telefone.trim() || !customerData.endereco.trim()) {
      toast.error('Preencha nome, telefone e endereço do cliente.');
      return;
    }

    const orderItems: AdminOrderItem[] = sellerCart.map((item) => ({
      productId: item.product.id,
      nome: item.product.nome_completo || item.product.nome,
      categoria: item.product.categoria,
      quantidade: item.quantity,
      precoUnitario: getSellerItemPrice(item),
      subtotal: item.quantity * getSellerItemPrice(item),
    }));

    const newOrder = createOrder({
      customerNome: customerData.nome,
      customerTelefone: customerData.telefone,
      customerEndereco: customerData.endereco,
      items: orderItems,
      total: sellerTotal,
    });

    sellerCart.forEach((item) => {
      if (item.source !== 'catalog') return;
      const current = stock.getStock(item.product.categoria, item.product.id);
      const next = Math.max(0, current - item.quantity);
      stock.setStock(item.product.categoria, item.product.id, next);
    });

    setSellerCart([]);
    setCustomerData({ nome: '', telefone: '', endereco: '' });
    const targetPhone = formatWhatsAppPhone(newOrder.customerTelefone);
    const message = buildOrderWhatsAppMessage(newOrder);
    const shareUrl = targetPhone
      ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(shareUrl, '_blank');
    toast.success(`Pedido ${newOrder.code} gerado com sucesso.`);
    navigate('/admin/pedidos');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="bg-slate-800/80 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a
              href="/admin"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
              title="Voltar para administrativo"
              aria-label="Voltar para administrativo"
            >
              <ArrowLeft size={16} />
            </a>
            <h1 className="text-lg font-bold text-white">Criar Pedido</h1>
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              logout();
              window.location.href = '/';
            }}
            className="text-slate-400 hover:text-red-400 h-9 px-2"
          >
            <LogOut size={16} />
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-slate-700 bg-slate-800/50 p-4">
          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-500" />
            <Input
              value={sellerSearch}
              onChange={(e) => setSellerSearch(e.target.value)}
              placeholder="Buscar produto para adicionar..."
              className="pl-9 bg-slate-900 border-slate-700 text-white h-9 rounded-xl"
            />
          </div>
          <div className="space-y-2 max-h-[68vh] overflow-y-auto pr-1">
            {sellerProducts.map((product) => (
              <div
                key={`${product.categoria}-${product.id}`}
                className="border border-slate-700 rounded-xl p-3 flex items-center justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{product.nome_completo || product.nome}</p>
                  <p className="text-xs text-slate-400">{product.categoria} • R$ {product.preco_unitario.toFixed(2)}</p>
                </div>
                <Button onClick={() => addSellerProduct(product)} size="sm" className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Plus size={14} className="mr-1" /> Adicionar
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4 space-y-4">
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 space-y-2">
            <p className="text-sm font-semibold">Adicionar produto rápido</p>
            <Input
              value={quickProductForm.nome}
              onChange={(e) => setQuickProductForm((p) => ({ ...p, nome: e.target.value }))}
              className="bg-slate-900 border-slate-700 text-white h-9"
              placeholder="Nome do produto"
            />
            <Input
              value={quickProductForm.descricao}
              onChange={(e) => setQuickProductForm((p) => ({ ...p, descricao: e.target.value }))}
              className="bg-slate-900 border-slate-700 text-white h-9"
              placeholder="Descrição"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={quickProductForm.unidade}
                onChange={(e) => setQuickProductForm((p) => ({ ...p, unidade: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-xl px-3 h-9"
              >
                <option value="Un.">Un.</option>
                <option value="Dz.">Dz.</option>
                <option value="Cx.">Cx.</option>
              </select>
              <Input
                type="number"
                min="1"
                step="1"
                value={quickProductForm.quantidade}
                onChange={(e) => setQuickProductForm((p) => ({ ...p, quantidade: e.target.value }))}
                className="bg-slate-900 border-slate-700 text-white h-9"
                placeholder="Quantidade"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={quickProductForm.valorUnitario}
                onChange={(e) => setQuickProductForm((p) => ({ ...p, valorUnitario: e.target.value }))}
                className="bg-slate-900 border-slate-700 text-white h-9"
                placeholder="Valor unitário"
              />
              <Input
                type="number"
                step="0.01"
                min="0"
                value={quickProductForm.valorEmbalagem}
                onChange={(e) => setQuickProductForm((p) => ({ ...p, valorEmbalagem: e.target.value }))}
                className="bg-slate-900 border-slate-700 text-white h-9"
                placeholder="Valor total (cx/dz)"
              />
            </div>
            <select
              value={quickProductForm.priceMode}
              onChange={(e) => setQuickProductForm((p) => ({ ...p, priceMode: e.target.value as 'unitario' | 'embalagem' }))}
              className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-xl px-3 h-9"
            >
              <option value="unitario">Preço aplicado: Unitário</option>
              <option value="embalagem">Preço aplicado: Caixa/Dúzia</option>
            </select>
            <p className="text-xs text-slate-400">
              Total do item: <span className="text-slate-200 font-medium">R$ {quickProductTotal.toFixed(2)}</span>
            </p>
            <Button
              onClick={addManualProduct}
              className="w-full h-9 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
            >
              Adicionar item manual
            </Button>
          </div>

          <h2 className="font-semibold">Carrinho do Pedido</h2>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {sellerCart.length === 0 && <p className="text-sm text-slate-400">Nenhum item adicionado.</p>}
            {sellerCart.map((item) => (
              <div key={`${item.product.categoria}-${item.product.id}`} className="border border-slate-700 rounded-lg p-2">
                <p className="text-sm truncate">{item.product.nome}</p>
                {item.source === 'manual' && (
                  <p className="text-xs text-blue-300">
                    Item manual • {item.product.unidade} • {item.priceMode === 'embalagem' ? 'Preço caixa/dúzia' : 'Preço unitário'}
                  </p>
                )}
                <div className="mt-1 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateSellerQuantity(item.product.id, item.product.categoria, item.quantity - 1)}
                      className="w-7 h-7 rounded-md bg-slate-700 hover:bg-slate-600 flex items-center justify-center"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="w-8 text-center text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateSellerQuantity(item.product.id, item.product.categoria, item.quantity + 1)}
                      className="w-7 h-7 rounded-md bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                  <span className="text-sm font-semibold">R$ {(item.quantity * getSellerItemPrice(item)).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-400">Nome do cliente</label>
            <Input
              value={customerData.nome}
              onChange={(e) => setCustomerData((p) => ({ ...p, nome: e.target.value }))}
              className="bg-slate-900 border-slate-700 text-white h-9"
              placeholder="Nome"
            />

            <label className="text-xs text-slate-400">Telefone</label>
            <Input
              value={customerData.telefone}
              onChange={(e) => setCustomerData((p) => ({ ...p, telefone: e.target.value }))}
              className="bg-slate-900 border-slate-700 text-white h-9"
              placeholder="Telefone"
            />

            <label className="text-xs text-slate-400">Endereço</label>
            <textarea
              value={customerData.endereco}
              onChange={(e) => setCustomerData((p) => ({ ...p, endereco: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-white text-sm resize-none"
              rows={3}
              placeholder="Endereço"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-sm text-slate-400">Total</span>
            <span className="font-bold text-lg">R$ {sellerTotal.toFixed(2)}</span>
          </div>

          <Button
            onClick={handleGenerateOrder}
            className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            Gerar Pedido
          </Button>
        </div>
      </div>
    </div>
  );
}
