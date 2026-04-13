import { useState, useMemo } from 'react';
import {
  Plus, Trash2, Search, LogOut, Package, Edit3, X, Save,
  ArrowLeft, Filter, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth, useProductManager } from '@/hooks/useAdmin';
import { toast } from 'sonner';
import catalogData from '../../../produtos.json';

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

export default function Admin() {
  const { isAuthenticated, logout } = useAuth();
  const pm = useProductManager(catalogData as any);

  // Synchronous auth guard — redirect immediately if not authenticated
  if (!isAuthenticated) {
    window.location.href = '/login';
    return null;
  }

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Produto | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ categoria: string; id: number } | null>(null);

  // New product form state
  const [formData, setFormData] = useState({
    nome: '',
    nome_completo: '',
    categoria: '',
    novaCategoria: '',
    preco_unitario: '',
    preco_embalagem: '',
    unidade: 'Un.',
  });

  const allProducts = useMemo(() => {
    let products = pm.getAllProducts();

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
  }, [pm, searchTerm, filterCategory]);

  const categories = pm.getCategories();

  const resetForm = () => {
    setFormData({
      nome: '',
      nome_completo: '',
      categoria: '',
      novaCategoria: '',
      preco_unitario: '',
      preco_embalagem: '',
      unidade: 'Un.',
    });
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const categoria = formData.novaCategoria || formData.categoria;
    if (!categoria) {
      toast.error('Selecione ou crie uma categoria');
      return;
    }

    pm.addProduct({
      nome: formData.nome.length > 50 ? formData.nome.substring(0, 50) + '...' : formData.nome,
      nome_completo: formData.nome_completo || formData.nome,
      categoria,
      preco_unitario: parseFloat(formData.preco_unitario) || 0,
      preco_embalagem: parseFloat(formData.preco_embalagem) || 0,
      unidade: formData.unidade,
      icon: 'Package',
    });

    toast.success('Produto cadastrado com sucesso!');
    resetForm();
    setShowAddForm(false);
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    pm.updateProduct(editingProduct.categoria, editingProduct.id, {
      nome: formData.nome.length > 50 ? formData.nome.substring(0, 50) + '...' : formData.nome,
      nome_completo: formData.nome_completo || formData.nome,
      preco_unitario: parseFloat(formData.preco_unitario) || 0,
      preco_embalagem: parseFloat(formData.preco_embalagem) || 0,
      unidade: formData.unidade,
    });

    toast.success('Produto atualizado!');
    setEditingProduct(null);
    resetForm();
  };

  const handleDelete = () => {
    if (!deleteConfirm) return;
    pm.removeProduct(deleteConfirm.categoria, deleteConfirm.id);
    toast.success('Produto removido');
    setDeleteConfirm(null);
  };

  const startEdit = (product: Produto) => {
    setEditingProduct(product);
    setFormData({
      nome: product.nome,
      nome_completo: product.nome_completo,
      categoria: product.categoria,
      novaCategoria: '',
      preco_unitario: product.preco_unitario.toString(),
      preco_embalagem: product.preco_embalagem.toString(),
      unidade: product.unidade,
    });
    setShowAddForm(false);
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg shadow-sm border-b border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a
                href="/"
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
              </a>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Package size={20} className="text-emerald-600" />
                  Painel Administrativo
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {allProducts.length} produtos • {categories.length} categorias
                </p>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="text-red-500 border-red-200 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl"
            >
              <LogOut size={14} className="mr-1.5" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-5xl">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-2.5 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-xl h-10 border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl text-sm min-w-[140px]"
            >
              <option value="">Todas categorias</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <Button
              onClick={() => { setShowAddForm(true); setEditingProduct(null); resetForm(); }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 px-4 flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Novo Produto</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </div>
        </div>

        {/* Add/Edit Form Modal */}
        {(showAddForm || editingProduct) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowAddForm(false); setEditingProduct(null); }} />
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  {editingProduct ? <Edit3 size={18} className="text-blue-600" /> : <Plus size={18} className="text-emerald-600" />}
                  {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                </h2>
                <button
                  onClick={() => { setShowAddForm(false); setEditingProduct(null); }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X size={18} className="text-slate-500" />
                </button>
              </div>

              <form onSubmit={editingProduct ? handleEdit : handleAdd} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nome do produto *</label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Agulha de costura"
                    className="rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nome completo</label>
                  <Input
                    value={formData.nome_completo}
                    onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                    placeholder="Nome completo do produto"
                    className="rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>

                {!editingProduct && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Categoria *</label>
                    <select
                      value={formData.categoria}
                      onChange={(e) => setFormData({ ...formData, categoria: e.target.value, novaCategoria: '' })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl text-sm"
                    >
                      <option value="">Selecione uma categoria</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <div className="mt-2">
                      <Input
                        value={formData.novaCategoria}
                        onChange={(e) => setFormData({ ...formData, novaCategoria: e.target.value, categoria: '' })}
                        placeholder="Ou crie uma nova categoria..."
                        className="rounded-xl text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Preço Unitário (R$) *</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.preco_unitario}
                      onChange={(e) => setFormData({ ...formData, preco_unitario: e.target.value })}
                      placeholder="0.00"
                      className="rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Preço Embalagem (R$)</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.preco_embalagem}
                      onChange={(e) => setFormData({ ...formData, preco_embalagem: e.target.value })}
                      placeholder="0.00"
                      className="rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Unidade</label>
                  <select
                    value={formData.unidade}
                    onChange={(e) => setFormData({ ...formData, unidade: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl text-sm"
                  >
                    <option value="Un.">Un. (Unidade)</option>
                    <option value="Pct.">Pct. (Pacote)</option>
                    <option value="Dz.">Dz. (Dúzia)</option>
                    <option value="Cx.">Cx. (Caixa)</option>
                    <option value="Mt.">Mt. (Metro)</option>
                    <option value="Kg.">Kg. (Quilograma)</option>
                    <option value="Par">Par</option>
                    <option value="Rolo">Rolo</option>
                    <option value="Ct.">Ct. (Cartela)</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setShowAddForm(false); setEditingProduct(null); }}
                    className="flex-1 rounded-xl"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className={`flex-1 rounded-xl text-white shadow-sm ${editingProduct ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                  >
                    <Save size={16} className="mr-1.5" />
                    {editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border p-6 max-w-sm w-full animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <AlertTriangle size={24} className="text-red-500" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white">Confirmar exclusão</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Esta ação não pode ser desfeita</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-xl">
                  Cancelar
                </Button>
                <Button onClick={handleDelete} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl">
                  <Trash2 size={14} className="mr-1.5" />
                  Excluir
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Products Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          {allProducts.length === 0 ? (
            <div className="text-center py-16">
              <Package size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
              <p className="text-slate-500 dark:text-slate-400">Nenhum produto encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Produto</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 hidden sm:table-cell">Categoria</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Unit.</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 hidden sm:table-cell">Emb.</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 w-24">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {allProducts.map((product) => (
                    <tr
                      key={`${product.categoria}-${product.id}`}
                      className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-gradient-to-br from-blue-50 to-green-50 dark:from-slate-800 dark:to-slate-700 flex-shrink-0 flex items-center justify-center">
                            {product.imagens && product.imagens.length > 0 ? (
                              <img src={product.imagens[0]} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Package size={14} className="text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-800 dark:text-white truncate max-w-[200px] sm:max-w-[300px]">
                              {product.nome}
                            </p>
                            <p className="text-xs text-slate-400 sm:hidden">{product.categoria}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-lg font-medium">
                          {product.categoria}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                        R$ {product.preco_unitario.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400 hidden sm:table-cell">
                        R$ {product.preco_embalagem.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => startEdit(product)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            title="Editar"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ categoria: product.categoria, id: product.id })}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
