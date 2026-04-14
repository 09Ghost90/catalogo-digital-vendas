import { useState, useMemo } from 'react';
import {
  Plus, Trash2, Search, LogOut, Package, Edit3, X, Save,
  ArrowLeft, Filter, AlertTriangle, Image as ImageIcon, Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth, useProductManager } from '@/hooks/useAdmin';
import { useCatalog } from '@/hooks/useCatalog';
import type { Produto } from '@/hooks/useCatalog';
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
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
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

export default function Admin() {
  const { isAuthenticated, logout } = useAuth();
  const pm = useProductManager();
  const { data: catalog, loading: catalogLoading, refetch } = useCatalog();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Produto | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ categoria: string; id: number } | null>(null);

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
      products = products.filter(p => p.categoria === filterCategory);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      products = products.filter(p =>
        p.nome.toLowerCase().includes(term) ||
        p.nome_completo.toLowerCase().includes(term) ||
        p.categoria.toLowerCase().includes(term)
      );
    }

    return products.sort((a, b) => a.nome.localeCompare(b.nome));
  }, [catalog, searchTerm, filterCategory]);

  const categories = Object.keys(catalog?.categorias || {}).sort();

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
          <p className="text-slate-400 text-sm">Carregando painel...</p>
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
    
    toast.loading('Comprimindo imagens...', { id: 'img-upload' });
    try {
      const bases = await Promise.all(files.map(f => compressImage(f)));
      setFormData(prev => ({
        ...prev,
        imagens: [...prev.imagens, ...bases].slice(0, 5)
      }));
      toast.success('Imagens anexadas!', { id: 'img-upload' });
    } catch (err) {
      toast.error('Erro ao comprimir imagem', { id: 'img-upload' });
    }
  };

  const handleCategoryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImage(file, 400, 400);
      setFormData(prev => ({ ...prev, newCategoryImage: base64 }));
    } catch {
      toast.error('Erro ao processar imagem da categoria');
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const categoria = formData.novaCategoria || formData.categoria;
    if (!categoria) {
      toast.error('Selecione ou crie uma categoria');
      return;
    }

    toast.loading('Salvando produto...', { id: 'save-product' });
    const result = await pm.addProduct({
      nome: formData.nome.length > 50 ? formData.nome.substring(0, 50) + '...' : formData.nome,
      nome_completo: formData.nome_completo || formData.nome,
      categoria,
      preco_unitario: parseFloat(formData.preco_unitario) || 0,
      preco_embalagem: parseFloat(formData.preco_embalagem) || 0,
      unidade: formData.unidade,
      imagens: formData.imagens,
      icon: 'Package',
    }, formData.newCategoryImage);

    if (result) {
      toast.success('Produto cadastrado com sucesso!', { id: 'save-product' });
      resetForm();
      setShowAddForm(false);
      refetch();
    } else {
      toast.error('Erro ao cadastrar produto', { id: 'save-product' });
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    toast.loading('Atualizando...', { id: 'edit-product' });
    const success = await pm.updateProduct(editingProduct.id, {
      nome: formData.nome.length > 50 ? formData.nome.substring(0, 50) + '...' : formData.nome,
      nome_completo: formData.nome_completo || formData.nome,
      preco_unitario: parseFloat(formData.preco_unitario) || 0,
      preco_embalagem: parseFloat(formData.preco_embalagem) || 0,
      unidade: formData.unidade,
      imagens: formData.imagens,
      categoria: formData.novaCategoria || formData.categoria
    }, formData.newCategoryImage);

    if (success) {
      toast.success('Produto atualizado!', { id: 'edit-product' });
      setEditingProduct(null);
      resetForm();
      refetch();
    } else {
      toast.error('Erro ao atualizar produto', { id: 'edit-product' });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    toast.loading('Removendo...', { id: 'delete-product' });
    const success = await pm.removeProduct(deleteConfirm.id);
    if (success) {
      toast.success('Produto removido', { id: 'delete-product' });
      refetch();
    } else {
      toast.error('Erro ao remover produto', { id: 'delete-product' });
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

  // === RENDER ===
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Top Bar */}
      <div className="bg-slate-800/80 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1">
              <ArrowLeft size={14} />
            </a>
            <h1 className="text-lg font-bold text-white">Painel Administrativo</h1>
            <span className="text-xs text-slate-500 hidden sm:inline">
              {allProducts.length} produto{allProducts.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => { setShowAddForm(true); resetForm(); }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm h-9 px-3 rounded-xl"
            >
              <Plus size={16} className="mr-1" /> Novo
            </Button>
            <Button
              variant="ghost"
              onClick={() => { logout(); window.location.href = '/'; }}
              className="text-slate-400 hover:text-red-400 h-9 px-2"
            >
              <LogOut size={16} />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Search + Filter */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-500" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar produtos..."
              className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 h-9 rounded-xl"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 h-9"
          >
            <option value="">Todas categorias</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Products Grid */}
        <div className="grid gap-3">
          {allProducts.map(product => (
            <div key={product.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between group hover:border-slate-600 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                {product.imagens && product.imagens.length > 0 ? (
                  <img src={product.imagens[0]} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <Package size={16} className="text-slate-400" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{product.nome_completo || product.nome}</p>
                  <p className="text-xs text-slate-400">{product.categoria} · {product.unidade} · R$ {product.preco_unitario.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="sm" variant="ghost" onClick={() => startEdit(product)} className="h-8 w-8 p-0 text-slate-400 hover:text-blue-400">
                  <Edit3 size={14} />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm({ categoria: product.categoria, id: product.id })} className="h-8 w-8 p-0 text-slate-400 hover:text-red-400">
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
          {allProducts.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Package size={40} className="mx-auto mb-3 opacity-30" />
              <p>Nenhum produto encontrado</p>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {(showAddForm || editingProduct) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => { setShowAddForm(false); setEditingProduct(null); resetForm(); }} className="text-slate-400 h-8 w-8 p-0">
                <X size={18} />
              </Button>
            </div>
            <form onSubmit={editingProduct ? handleEdit : handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nome do Produto *</label>
                <Input value={formData.nome} onChange={e => setFormData(p => ({ ...p, nome: e.target.value }))} required className="bg-slate-900 border-slate-700 text-white h-9 rounded-xl" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nome Completo</label>
                <Input value={formData.nome_completo} onChange={e => setFormData(p => ({ ...p, nome_completo: e.target.value }))} className="bg-slate-900 border-slate-700 text-white h-9 rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Categoria *</label>
                  <select value={formData.categoria} onChange={e => setFormData(p => ({ ...p, categoria: e.target.value }))} className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-xl px-3 h-9">
                    <option value="">Selecionar...</option>
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Ou criar nova</label>
                  <Input value={formData.novaCategoria} onChange={e => setFormData(p => ({ ...p, novaCategoria: e.target.value }))} placeholder="Nova categoria..." className="bg-slate-900 border-slate-700 text-white h-9 rounded-xl" />
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
                  <Input type="number" step="0.01" value={formData.preco_unitario} onChange={e => setFormData(p => ({ ...p, preco_unitario: e.target.value }))} required className="bg-slate-900 border-slate-700 text-white h-9 rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Preço Emb.</label>
                  <Input type="number" step="0.01" value={formData.preco_embalagem} onChange={e => setFormData(p => ({ ...p, preco_embalagem: e.target.value }))} className="bg-slate-900 border-slate-700 text-white h-9 rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Unidade</label>
                  <select value={formData.unidade} onChange={e => setFormData(p => ({ ...p, unidade: e.target.value }))} className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-xl px-3 h-9">
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
                        <button type="button" onClick={() => setFormData(p => ({ ...p, imagens: p.imagens.filter((_, j) => j !== i) }))} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button type="submit" disabled={pm.loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-10 rounded-xl font-semibold">
                {pm.loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Salvando...
                  </div>
                ) : (
                  <>{editingProduct ? <Save size={16} className="mr-1" /> : <Plus size={16} className="mr-1" />} {editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}</>
                )}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full">
            <div className="text-center">
              <AlertTriangle size={40} className="text-amber-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">Confirmar Exclusão</h3>
              <p className="text-slate-400 text-sm mb-5">Tem certeza que deseja remover este produto? Essa ação não pode ser desfeita.</p>
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
