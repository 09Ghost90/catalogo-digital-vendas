import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  Search,
  LogOut,
  Package,
  Edit3,
  X,
  Save,
  ArrowLeft,
  AlertTriangle,
  Image as ImageIcon,
  Upload,
  ClipboardList,
  Box,
  ShoppingCart,
  Minus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth, useProductManager } from '@/hooks/useAdmin';
import { useCatalog } from '@/hooks/useCatalog';
import type { Produto } from '@/hooks/useCatalog';
import { LOW_STOCK_THRESHOLD, useStockManager } from '@/hooks/useStock';
import { useOrders } from '@/hooks/useOrders';
import type { AdminOrderItem, OrderStatus } from '@/hooks/useOrders';
import { toast } from 'sonner';

// Utility for client-side image compression
async function compressImage(file: File, maxWidth = 600, maxHeight = 600): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('No context');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = (e) => reject(e);
    };
    reader.onerror = (e) => reject(e);
  });
}

type AdminTab = 'estoque' | 'criar-pedido' | 'pedidos';

interface SellerCartItem {
  product: Produto;
  quantity: number;
}

function stockKey(product: Produto): string {
  return `${product.categoria}::${product.id}`;
}

export default function Admin() {
  const { isAuthenticated, logout } = useAuth();
  const pm = useProductManager();
  const { data: catalog, loading: catalogLoading, refetch } = useCatalog();
  const stock = useStockManager();
  const { orders, createOrder, updateStatus } = useOrders();

  const [activeTab, setActiveTab] = useState<AdminTab>('estoque');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Produto | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number } | null>(null);

  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});

  const [sellerSearch, setSellerSearch] = useState('');
  const [sellerCart, setSellerCart] = useState<SellerCartItem[]>([]);
  const [customerData, setCustomerData] = useState({ nome: '', telefone: '', endereco: '' });

  const [formData, setFormData] = useState({
    nome: '',
    nome_completo: '',
    categoria: '',
    novaCategoria: '',
    preco_unitario: '',
    preco_embalagem: '',
    unidade: 'Un.',
    imagens: [] as string[],
    newCategoryImage: '',
  });

  const allProducts = useMemo(() => {
    if (!catalog) return [];
    let products = Object.values(catalog.categorias).flat();

    if (filterCategory) {
      products = products.filter((p) => p.categoria === filterCategory);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      products = products.filter(
        (p) =>
          p.nome.toLowerCase().includes(term) ||
          p.nome_completo.toLowerCase().includes(term) ||
          p.categoria.toLowerCase().includes(term)
      );
    }

    return products.sort((a, b) => a.nome.localeCompare(b.nome));
  }, [catalog, searchTerm, filterCategory]);

  const categories = useMemo(() => Object.keys(catalog?.categorias || {}).sort(), [catalog]);

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
    return sellerCart.reduce((acc, item) => acc + item.product.preco_unitario * item.quantity, 0);
  }, [sellerCart]);

  useEffect(() => {
    const nextDrafts: Record<string, string> = {};
    allProducts.forEach((product) => {
      nextDrafts[stockKey(product)] = String(stock.getStock(product.categoria, product.id));
    });
    setStockDrafts(nextDrafts);
  }, [allProducts, stock.getStock]);

  // Auth guard — AFTER all hooks
  if (!isAuthenticated) {
    window.location.href = '/login';
    return null;
  }

  // Loading guard — AFTER all hooks
  if (catalogLoading || !catalog) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Carregando administrativo...</p>
        </div>
      </div>
    );
  }

  const resetForm = () => {
    setFormData({
      nome: '',
      nome_completo: '',
      categoria: '',
      novaCategoria: '',
      preco_unitario: '',
      preco_embalagem: '',
      unidade: 'Un.',
      imagens: [],
      newCategoryImage: '',
    });
  };

  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    toast.loading('Processando imagens...', { id: 'img-upload' });
    try {
      const bases = await Promise.all(files.map((f) => compressImage(f)));
      setFormData((prev) => ({
        ...prev,
        imagens: [...prev.imagens, ...bases].slice(0, 5),
      }));
      toast.success('Imagens anexadas.', { id: 'img-upload' });
    } catch {
      toast.error('Falha ao processar imagem.', { id: 'img-upload' });
    }
  };

  const handleCategoryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImage(file, 400, 400);
      setFormData((prev) => ({ ...prev, newCategoryImage: base64 }));
    } catch {
      toast.error('Falha ao processar imagem da categoria.');
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const categoria = formData.novaCategoria || formData.categoria;
    if (!categoria) {
      toast.error('Selecione ou crie uma categoria.');
      return;
    }

    toast.loading('Salvando produto...', { id: 'save-product' });
    const result = await pm.addProduct(
      {
        nome: formData.nome.length > 50 ? formData.nome.substring(0, 50) + '...' : formData.nome,
        nome_completo: formData.nome_completo || formData.nome,
        categoria,
        preco_unitario: parseFloat(formData.preco_unitario) || 0,
        preco_embalagem: parseFloat(formData.preco_embalagem) || 0,
        unidade: formData.unidade,
        imagens: formData.imagens,
        icon: 'Package',
      },
      formData.newCategoryImage
    );

    if (result) {
      toast.success('Produto cadastrado.', { id: 'save-product' });
      resetForm();
      setShowAddForm(false);
      refetch();
    } else {
      toast.error('Erro ao cadastrar produto.', { id: 'save-product' });
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    toast.loading('Atualizando produto...', { id: 'edit-product' });
    const success = await pm.updateProduct(
      editingProduct.id,
      {
        nome: formData.nome.length > 50 ? formData.nome.substring(0, 50) + '...' : formData.nome,
        nome_completo: formData.nome_completo || formData.nome,
        preco_unitario: parseFloat(formData.preco_unitario) || 0,
        preco_embalagem: parseFloat(formData.preco_embalagem) || 0,
        unidade: formData.unidade,
        imagens: formData.imagens,
        categoria: formData.novaCategoria || formData.categoria,
      },
      formData.newCategoryImage
    );

    if (success) {
      toast.success('Produto atualizado.', { id: 'edit-product' });
      setEditingProduct(null);
      resetForm();
      refetch();
    } else {
      toast.error('Erro ao atualizar produto.', { id: 'edit-product' });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    toast.loading('Removendo produto...', { id: 'delete-product' });
    const success = await pm.removeProduct(deleteConfirm.id);
    if (success) {
      toast.success('Produto removido.', { id: 'delete-product' });
      refetch();
    } else {
      toast.error('Erro ao remover produto.', { id: 'delete-product' });
    }
    setDeleteConfirm(null);
  };

  const startEdit = (product: Produto) => {
    setEditingProduct(product);
    setFormData({
      nome: product.nome,
      nome_completo: product.nome_completo,
      categoria: product.categoria,
      novaCategoria: '',
      preco_unitario: String(product.preco_unitario),
      preco_embalagem: String(product.preco_embalagem),
      unidade: product.unidade,
      imagens: product.imagens || [],
      newCategoryImage: '',
    });
  };

  const updateStockQuantity = (product: Produto) => {
    const key = stockKey(product);
    const next = Number.parseInt(stockDrafts[key] || '0', 10);
    if (Number.isNaN(next) || next < 0) {
      toast.error('Quantidade inválida de estoque.');
      return;
    }

    stock.setStock(product.categoria, product.id, next);
    toast.success('Estoque atualizado.');
  };

  const addSellerProduct = (product: Produto) => {
    setSellerCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id && item.product.categoria === product.categoria);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id && item.product.categoria === product.categoria
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
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
      precoUnitario: item.product.preco_unitario,
      subtotal: item.quantity * item.product.preco_unitario,
    }));

    const newOrder = createOrder({
      customerNome: customerData.nome,
      customerTelefone: customerData.telefone,
      customerEndereco: customerData.endereco,
      items: orderItems,
      total: sellerTotal,
    });

    sellerCart.forEach((item) => {
      const current = stock.getStock(item.product.categoria, item.product.id);
      const next = Math.max(0, current - item.quantity);
      stock.setStock(item.product.categoria, item.product.id, next);
    });

    setSellerCart([]);
    setCustomerData({ nome: '', telefone: '', endereco: '' });
    setActiveTab('pedidos');
    toast.success(`Pedido ${newOrder.code} gerado com sucesso.`);
  };

  const pendingOrders = orders.filter((order) => order.status === 'pendente').length;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="bg-slate-800/80 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1">
              <ArrowLeft size={14} />
              Início
            </a>
            <h1 className="text-lg font-bold text-white">Administrativo</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setShowAddForm(true);
                resetForm();
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm h-9 px-3 rounded-xl"
            >
              <Plus size={16} className="mr-1" /> Novo Produto
            </Button>
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
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-3">
            <p className="text-xs text-slate-400">Produtos</p>
            <p className="text-xl font-bold">{Object.values(catalog.categorias).flat().length}</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-3">
            <p className="text-xs text-slate-400">Estoque baixo</p>
            <p className="text-xl font-bold text-amber-400">{stock.lowStockCount}</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-3">
            <p className="text-xs text-slate-400">Pedidos</p>
            <p className="text-xl font-bold">{orders.length}</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-3">
            <p className="text-xs text-slate-400">Pendentes</p>
            <p className="text-xl font-bold text-orange-400">{pendingOrders}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('estoque')}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              activeTab === 'estoque'
                ? 'bg-emerald-600 border-emerald-500 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
            }`}
          >
            <Box size={15} className="inline mr-1.5" /> Gestão de Estoque
          </button>
          <button
            onClick={() => setActiveTab('criar-pedido')}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              activeTab === 'criar-pedido'
                ? 'bg-emerald-600 border-emerald-500 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
            }`}
          >
            <ShoppingCart size={15} className="inline mr-1.5" /> Criar Pedido
          </button>
          <button
            onClick={() => setActiveTab('pedidos')}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              activeTab === 'pedidos'
                ? 'bg-emerald-600 border-emerald-500 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
            }`}
          >
            <ClipboardList size={15} className="inline mr-1.5" /> Pedidos
          </button>
        </div>

        {activeTab === 'estoque' && (
          <section className="space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-2.5 text-slate-500" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar produtos no estoque..."
                  className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 h-9 rounded-xl"
                />
              </div>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 h-9"
              >
                <option value="">Todas categorias</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              {allProducts.map((product) => {
                const key = stockKey(product);
                const qty = stock.getStock(product.categoria, product.id);
                const lowStock = qty <= LOW_STOCK_THRESHOLD;
                return (
                  <div
                    key={`${product.categoria}-${product.id}`}
                    className={`rounded-xl border p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                      lowStock
                        ? 'bg-amber-500/10 border-amber-500/40'
                        : 'bg-slate-800/50 border-slate-700/60'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{product.nome_completo || product.nome}</p>
                      <p className="text-xs text-slate-400">{product.categoria} • R$ {product.preco_unitario.toFixed(2)}</p>
                      {lowStock && <p className="text-xs text-amber-300 mt-1">Estoque baixo</p>}
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        value={stockDrafts[key] ?? '0'}
                        onChange={(e) => setStockDrafts((prev) => ({ ...prev, [key]: e.target.value }))}
                        className="w-24 h-8 bg-slate-900 border-slate-700 text-white"
                      />
                      <Button size="sm" onClick={() => updateStockQuantity(product)} className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white">
                        Atualizar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => startEdit(product)} className="h-8 w-8 p-0 text-slate-300 hover:text-blue-300">
                        <Edit3 size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteConfirm({ id: product.id })}
                        className="h-8 w-8 p-0 text-slate-300 hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                );
              })}

              {allProducts.length === 0 && (
                <div className="text-center py-12 text-slate-500 rounded-xl border border-slate-700 bg-slate-800/40">
                  <Package size={40} className="mx-auto mb-3 opacity-30" />
                  <p>Nenhum produto encontrado.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'criar-pedido' && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
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
              <h2 className="font-semibold">Carrinho do Pedido</h2>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {sellerCart.length === 0 && <p className="text-sm text-slate-400">Nenhum item adicionado.</p>}
                {sellerCart.map((item) => (
                  <div key={`${item.product.categoria}-${item.product.id}`} className="border border-slate-700 rounded-lg p-2">
                    <p className="text-sm truncate">{item.product.nome}</p>
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
                      <span className="text-sm font-semibold">R$ {(item.quantity * item.product.preco_unitario).toFixed(2)}</span>
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
          </section>
        )}

        {activeTab === 'pedidos' && (
          <section className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4">
            <h2 className="font-semibold mb-3">Histórico de Pedidos</h2>
            {orders.length === 0 ? (
              <div className="text-center py-10 text-slate-400">Nenhum pedido registrado.</div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <div key={order.code} className="border border-slate-700 rounded-xl p-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm">{order.code}</p>
                        <p className="text-xs text-slate-400">{order.customerNome}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">
                          {new Date(order.createdAt).toLocaleString('pt-BR')}
                        </span>
                        <select
                          value={order.status}
                          onChange={(e) => updateStatus(order.code, e.target.value as OrderStatus)}
                          className="bg-slate-900 border border-slate-700 text-xs rounded-lg px-2 py-1"
                        >
                          <option value="pendente">pendente</option>
                          <option value="concluido">concluído</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-slate-300">
                      <p>Telefone: {order.customerTelefone}</p>
                      <p>Endereço: {order.customerEndereco}</p>
                    </div>

                    <div className="mt-3 border-t border-slate-700 pt-2 space-y-1">
                      {order.items.map((item, idx) => (
                        <div key={`${order.code}-${idx}`} className="flex items-center justify-between text-xs">
                          <span>{item.quantidade}x {item.nome}</span>
                          <span>R$ {item.subtotal.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 border-t border-slate-700 pt-2 flex justify-between font-semibold text-sm">
                      <span>Total</span>
                      <span>R$ {order.total.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {(showAddForm || editingProduct) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingProduct(null);
                  resetForm();
                }}
                className="text-slate-400 h-8 w-8 p-0"
              >
                <X size={18} />
              </Button>
            </div>
            <form onSubmit={editingProduct ? handleEdit : handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nome do Produto *</label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData((p) => ({ ...p, nome: e.target.value }))}
                  required
                  className="bg-slate-900 border-slate-700 text-white h-9 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nome Completo</label>
                <Input
                  value={formData.nome_completo}
                  onChange={(e) => setFormData((p) => ({ ...p, nome_completo: e.target.value }))}
                  className="bg-slate-900 border-slate-700 text-white h-9 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Categoria *</label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData((p) => ({ ...p, categoria: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-xl px-3 h-9"
                  >
                    <option value="">Selecionar...</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Ou criar nova</label>
                  <Input
                    value={formData.novaCategoria}
                    onChange={(e) => setFormData((p) => ({ ...p, novaCategoria: e.target.value }))}
                    placeholder="Nova categoria..."
                    className="bg-slate-900 border-slate-700 text-white h-9 rounded-xl"
                  />
                </div>
              </div>
              {formData.novaCategoria && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Foto da Categoria</label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-blue-400 hover:text-blue-300">
                    <Upload size={14} /> Anexar imagem da categoria
                    <input type="file" accept="image/*" className="hidden" onChange={handleCategoryImageUpload} />
                  </label>
                  {formData.newCategoryImage && (
                    <img src={formData.newCategoryImage} alt="Preview" className="w-16 h-16 rounded-lg mt-2 object-cover" />
                  )}
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Preço Unit. *</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.preco_unitario}
                    onChange={(e) => setFormData((p) => ({ ...p, preco_unitario: e.target.value }))}
                    required
                    className="bg-slate-900 border-slate-700 text-white h-9 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Preço Emb.</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.preco_embalagem}
                    onChange={(e) => setFormData((p) => ({ ...p, preco_embalagem: e.target.value }))}
                    className="bg-slate-900 border-slate-700 text-white h-9 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Unidade</label>
                  <select
                    value={formData.unidade}
                    onChange={(e) => setFormData((p) => ({ ...p, unidade: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-xl px-3 h-9"
                  >
                    <option value="Un.">Un.</option>
                    <option value="Dz.">Dz. (12)</option>
                    <option value="Ct.">Ct. (10)</option>
                    <option value="Cx.">Cx. (10)</option>
                    <option value="Pct.">Pct.</option>
                    <option value="Mt.">Mt.</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Fotos do Produto (até 5)</label>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-emerald-400 hover:text-emerald-300">
                  <ImageIcon size={14} /> Adicionar fotos
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleProductImageUpload} />
                </label>
                {formData.imagens.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {formData.imagens.map((img, i) => (
                      <div key={i} className="relative">
                        <img src={img} alt="" className="w-14 h-14 rounded-lg object-cover" />
                        <button
                          type="button"
                          onClick={() => setFormData((p) => ({ ...p, imagens: p.imagens.filter((_, j) => j !== i) }))}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button
                type="submit"
                disabled={pm.loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-10 rounded-xl font-semibold"
              >
                {pm.loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Salvando...
                  </div>
                ) : (
                  <>
                    {editingProduct ? <Save size={16} className="mr-1" /> : <Plus size={16} className="mr-1" />}
                    {editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full">
            <div className="text-center">
              <AlertTriangle size={40} className="text-amber-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">Confirmar exclusão</h3>
              <p className="text-slate-400 text-sm mb-5">Tem certeza que deseja remover este produto? Esta ação não pode ser desfeita.</p>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setDeleteConfirm(null)} className="flex-1 h-10 rounded-xl text-slate-400">
                  Cancelar
                </Button>
                <Button onClick={handleDelete} className="flex-1 bg-red-600 hover:bg-red-700 text-white h-10 rounded-xl">
                  <Trash2 size={14} className="mr-1" /> Remover
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
