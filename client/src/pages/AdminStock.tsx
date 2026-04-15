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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth, useProductManager } from '@/hooks/useAdmin';
import { useCatalog } from '@/hooks/useCatalog';
import type { Produto } from '@/hooks/useCatalog';
import { LOW_STOCK_THRESHOLD, useStockManager } from '@/hooks/useStock';
import { toast } from 'sonner';

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

function stockKey(product: Produto): string {
  return `${product.categoria}::${product.id}`;
}

function normalizeCategoryName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

const UNLINK_FALLBACK_CATEGORY = 'Sem categoria';

type CategoryModalMode = 'create' | 'edit';

export default function AdminStock() {
  const { isAuthenticated, logout } = useAuth();
  const pm = useProductManager();
  const { data: catalog, loading: catalogLoading, refetch } = useCatalog();
  const stock = useStockManager();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Produto | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number } | null>(null);
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});

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

  const [categoryModalMode, setCategoryModalMode] = useState<CategoryModalMode | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    originalName: '',
    name: '',
    image: '',
  });
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<string | null>(null);
  const [deleteCategoryAction, setDeleteCategoryAction] = useState<'unlink' | 'move'>('move');
  const [deleteCategoryMoveTarget, setDeleteCategoryMoveTarget] = useState('');

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

  const categorySummaries = useMemo(() => {
    if (!catalog) return [] as Array<{ name: string; image: string; productCount: number }>;

    const names = new Set<string>([
      ...Object.keys(catalog.categorias || {}),
      ...Object.keys(catalog.categoryImages || {}),
    ]);

    return Array.from(names)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({
        name,
        image: catalog.categoryImages?.[name] || '',
        productCount: catalog.categorias?.[name]?.length || 0,
      }));
  }, [catalog]);

  const categories = useMemo(() => categorySummaries.map((item) => item.name), [categorySummaries]);

  useEffect(() => {
    const nextDrafts: Record<string, string> = {};
    allProducts.forEach((product) => {
      nextDrafts[stockKey(product)] = String(stock.getStock(product.categoria, product.id));
    });
    setStockDrafts(nextDrafts);
  }, [allProducts, stock.getStock]);

  if (!isAuthenticated) {
    window.location.href = '/login';
    return null;
  }

  if (catalogLoading || !catalog) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Carregando gestão de estoque...</p>
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

  const closeProductModal = () => {
    setShowAddForm(false);
    setEditingProduct(null);
    resetForm();
  };

  const closeCategoryModal = () => {
    setCategoryModalMode(null);
    setCategoryForm({ originalName: '', name: '', image: '' });
  };

  const openCreateCategoryModal = () => {
    setCategoryForm({ originalName: '', name: '', image: '' });
    setCategoryModalMode('create');
  };

  const openEditCategoryModal = (categoryName: string) => {
    const summary = categorySummaries.find((item) => item.name === categoryName);
    setCategoryForm({
      originalName: categoryName,
      name: categoryName,
      image: summary?.image || '',
    });
    setCategoryModalMode('edit');
  };

  const hasCategoryNameConflict = (name: string, except?: string) => {
    const normalized = normalizeCategoryName(name).toLowerCase();
    if (!normalized) return false;
    const exceptNormalized = normalizeCategoryName(except || '').toLowerCase();
    return categorySummaries.some((item) => {
      const current = normalizeCategoryName(item.name).toLowerCase();
      return current === normalized && current !== exceptNormalized;
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

  const handleManagedCategoryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await compressImage(file, 800, 800);
      setCategoryForm((prev) => ({ ...prev, image: base64 }));
    } catch {
      toast.error('Falha ao processar imagem da categoria.');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = normalizeCategoryName(categoryForm.name);

    if (!name) {
      toast.error('Nome da categoria é obrigatório.');
      return;
    }

    if (hasCategoryNameConflict(name)) {
      toast.error('Já existe uma categoria com esse nome.');
      return;
    }

    if (!categoryForm.image) {
      toast.error('Envie uma imagem para a categoria.');
      return;
    }

    toast.loading('Criando categoria...', { id: 'create-category' });
    const result = await pm.createCategory(name, categoryForm.image);
    if (result.success) {
      toast.success('Categoria criada com sucesso.', { id: 'create-category' });
      closeCategoryModal();
      refetch();
    } else {
      toast.error(result.error || 'Erro ao criar categoria.', { id: 'create-category' });
    }
  };

  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const oldName = normalizeCategoryName(categoryForm.originalName);
    const nextName = normalizeCategoryName(categoryForm.name);

    if (!nextName) {
      toast.error('Nome da categoria é obrigatório.');
      return;
    }

    if (hasCategoryNameConflict(nextName, oldName)) {
      toast.error('Já existe uma categoria com esse nome.');
      return;
    }

    toast.loading('Atualizando categoria...', { id: 'edit-category' });
    const result = await pm.updateCategory(oldName, nextName, categoryForm.image || undefined);
    if (result.success) {
      if (oldName.toLowerCase() !== nextName.toLowerCase()) {
        stock.remapCategory(oldName, nextName);
      }
      toast.success('Categoria atualizada.', { id: 'edit-category' });
      closeCategoryModal();
      refetch();
    } else {
      toast.error(result.error || 'Erro ao atualizar categoria.', { id: 'edit-category' });
    }
  };

  const openDeleteCategoryDialog = (categoryName: string) => {
    const moveCandidates = categories.filter((item) => item !== categoryName);
    setDeleteCategoryAction(moveCandidates.length > 0 ? 'move' : 'unlink');
    setDeleteCategoryMoveTarget(moveCandidates[0] || '');
    setDeleteCategoryTarget(categoryName);
  };

  const closeDeleteCategoryDialog = () => {
    setDeleteCategoryTarget(null);
    setDeleteCategoryAction('move');
    setDeleteCategoryMoveTarget('');
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategoryTarget) return;

    const summary = categorySummaries.find((item) => item.name === deleteCategoryTarget);
    const linkedProducts = summary?.productCount || 0;
    const strategy = linkedProducts > 0 ? deleteCategoryAction : 'unlink';

    if (strategy === 'move' && !deleteCategoryMoveTarget) {
      toast.error('Selecione a categoria de destino para mover os produtos.');
      return;
    }

    if (strategy === 'unlink' && normalizeCategoryName(deleteCategoryTarget) === normalizeCategoryName(UNLINK_FALLBACK_CATEGORY)) {
      toast.error('Escolha a opção de mover produtos para excluir esta categoria.');
      return;
    }

    toast.loading('Excluindo categoria...', { id: 'delete-category' });
    const result = await pm.deleteCategory({
      categoryName: deleteCategoryTarget,
      strategy,
      targetCategory: strategy === 'move' ? deleteCategoryMoveTarget : undefined,
    });

    if (result.success) {
      if (linkedProducts > 0) {
        const target = strategy === 'move' ? deleteCategoryMoveTarget : UNLINK_FALLBACK_CATEGORY;
        stock.remapCategory(deleteCategoryTarget, target);
      }
      stock.clearCategory(deleteCategoryTarget);
      toast.success('Categoria excluída.', { id: 'delete-category' });
      closeDeleteCategoryDialog();
      refetch();
    } else {
      toast.error(result.error || 'Erro ao excluir categoria.', { id: 'delete-category' });
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const newCategory = normalizeCategoryName(formData.novaCategoria);
    const selectedCategory = normalizeCategoryName(formData.categoria);
    const categoria = newCategory || selectedCategory;

    if (!categoria) {
      toast.error('Selecione ou crie uma categoria.');
      return;
    }

    if (newCategory && hasCategoryNameConflict(newCategory)) {
      toast.error('Essa categoria já existe. Selecione ela na lista.');
      return;
    }

    if (newCategory && !formData.newCategoryImage) {
      toast.error('Para nova categoria, envie a imagem correspondente.');
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

    const newCategory = normalizeCategoryName(formData.novaCategoria);
    const selectedCategory = normalizeCategoryName(formData.categoria);
    const categoria = newCategory || selectedCategory;

    if (!categoria) {
      toast.error('Selecione ou crie uma categoria.');
      return;
    }

    if (newCategory && hasCategoryNameConflict(newCategory)) {
      toast.error('Essa categoria já existe. Selecione ela na lista.');
      return;
    }

    if (newCategory && !formData.newCategoryImage) {
      toast.error('Para nova categoria, envie a imagem correspondente.');
      return;
    }

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
        categoria,
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
            <h1 className="text-lg font-bold text-white">Gestão de Estoque</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setShowAddForm(true);
                resetForm();
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm h-9 px-3 rounded-xl"
            >
              <Plus size={14} className="mr-1" /> Novo Produto
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

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
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
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="rounded-xl border border-slate-700/60 bg-slate-800/50 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-white">Gestão de Categorias</h2>
              <p className="text-xs text-slate-400">Crie, edite e exclua categorias com imagem e vínculo automático.</p>
            </div>
            <Button onClick={openCreateCategoryModal} className="h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3">
              <Plus size={14} className="mr-1" /> Nova Categoria
            </Button>
          </div>

          <div className="grid gap-2">
            {categorySummaries.map((category) => (
              <div key={category.name} className="rounded-lg border border-slate-700 bg-slate-900/60 p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {category.image ? (
                    <img src={category.image} alt={category.name} className="w-12 h-12 rounded-lg object-cover border border-slate-700" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg border border-slate-700 bg-slate-800 flex items-center justify-center text-slate-300 font-semibold uppercase">
                      {category.name.slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{category.name}</p>
                    <p className="text-xs text-slate-400">{category.productCount} produto(s) vinculado(s)</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEditCategoryModal(category.name)} className="h-8 w-8 p-0 text-slate-300 hover:text-blue-300">
                    <Edit3 size={14} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openDeleteCategoryDialog(category.name)}
                    className="h-8 w-8 p-0 text-slate-300 hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}

            {categorySummaries.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/50 p-4 text-center text-sm text-slate-400">
                Nenhuma categoria cadastrada.
              </div>
            )}
          </div>
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
                  lowStock ? 'bg-amber-500/10 border-amber-500/40' : 'bg-slate-800/50 border-slate-700/60'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{product.nome_completo || product.nome}</p>
                  <p className="text-xs text-slate-400">{product.categoria} • {product.unidade} • R$ {product.preco_unitario.toFixed(2)}</p>
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
      </div>

      {(showAddForm || editingProduct) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeProductModal} />
          <div className="relative bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h2>
              <button
                onClick={closeProductModal}
                className="p-1.5 rounded-lg hover:bg-slate-700"
                aria-label="Fechar modal de produto"
              >
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            <form onSubmit={editingProduct ? handleEdit : handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nome do Produto *</label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData((p) => ({ ...p, nome: e.target.value }))}
                  required
                  className="rounded-xl bg-slate-900 border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nome Completo</label>
                <Input
                  value={formData.nome_completo}
                  onChange={(e) => setFormData((p) => ({ ...p, nome_completo: e.target.value }))}
                  className="rounded-xl bg-slate-900 border-slate-700 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Categoria *</label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData((p) => ({ ...p, categoria: e.target.value }))}
                    className="w-full border border-slate-700 bg-slate-900 text-white text-sm rounded-xl px-3 h-9"
                  >
                    <option value="">Selecionar...</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Ou criar nova</label>
                  <Input
                    value={formData.novaCategoria}
                    onChange={(e) => setFormData((p) => ({ ...p, novaCategoria: e.target.value }))}
                    placeholder="Nova categoria..."
                    className="rounded-xl bg-slate-900 border-slate-700 text-white"
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
                    className="rounded-xl bg-slate-900 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Preço Emb.</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.preco_embalagem}
                    onChange={(e) => setFormData((p) => ({ ...p, preco_embalagem: e.target.value }))}
                    className="rounded-xl bg-slate-900 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Unidade</label>
                  <select
                    value={formData.unidade}
                    onChange={(e) => setFormData((p) => ({ ...p, unidade: e.target.value }))}
                    className="w-full border border-slate-700 bg-slate-900 text-white text-sm rounded-xl px-3 h-9"
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

      {categoryModalMode && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeCategoryModal} />
          <div className="relative bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">
                {categoryModalMode === 'create' ? 'Nova Categoria' : 'Editar Categoria'}
              </h2>
              <button
                onClick={closeCategoryModal}
                className="p-1.5 rounded-lg hover:bg-slate-700"
                aria-label="Fechar modal de categoria"
              >
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={categoryModalMode === 'create' ? handleCreateCategory : handleEditCategory} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nome da categoria *</label>
                <Input
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Higiene e Beleza"
                  required
                  className="rounded-xl bg-slate-900 border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Imagem da categoria *</label>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-indigo-500 hover:text-indigo-400">
                  <Upload size={14} />
                  Upload da imagem
                  <input type="file" accept="image/*" className="hidden" onChange={handleManagedCategoryImageUpload} />
                </label>
                <p className="text-[11px] text-slate-500 mt-1">Use imagem em proporção 1:1 para manter padrão visual.</p>

                {categoryForm.image && (
                  <div className="mt-2 w-28">
                    <div className="aspect-square rounded-lg overflow-hidden border border-slate-700/60 bg-slate-800/60">
                      <img src={categoryForm.image} alt="Prévia da categoria" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}
              </div>

              <Button type="submit" disabled={pm.loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-10 rounded-xl font-semibold">
                {pm.loading ? 'Salvando...' : categoryModalMode === 'create' ? 'Criar Categoria' : 'Salvar Categoria'}
              </Button>
            </form>
          </div>
        </div>
      )}

      {deleteCategoryTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[75] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="text-center">
              <AlertTriangle size={40} className="text-amber-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">Excluir categoria</h3>
              <p className="text-slate-400 text-sm">
                {(() => {
                  const linkedCount = categorySummaries.find((item) => item.name === deleteCategoryTarget)?.productCount || 0;
                  if (linkedCount > 0) {
                    return `A categoria "${deleteCategoryTarget}" possui ${linkedCount} produto(s) vinculado(s).`;
                  }
                  return `Confirmar remoção da categoria "${deleteCategoryTarget}"?`;
                })()}
              </p>
            </div>

            {(() => {
              const linkedCount = categorySummaries.find((item) => item.name === deleteCategoryTarget)?.productCount || 0;
              const moveTargets = categories.filter((item) => item !== deleteCategoryTarget);
              return linkedCount > 0 ? (
                <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/60 p-3">
                  <label className="flex items-center gap-2 text-sm text-slate-200">
                    <input
                      type="radio"
                      checked={deleteCategoryAction === 'move'}
                      onChange={() => setDeleteCategoryAction('move')}
                      disabled={moveTargets.length === 0}
                    />
                    Mover produtos para outra categoria
                  </label>

                  <select
                    value={deleteCategoryMoveTarget}
                    onChange={(e) => setDeleteCategoryMoveTarget(e.target.value)}
                    disabled={deleteCategoryAction !== 'move' || moveTargets.length === 0}
                    className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 h-9"
                  >
                    {moveTargets.length === 0 ? (
                      <option value="">Sem categoria de destino disponível</option>
                    ) : (
                      moveTargets.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))
                    )}
                  </select>

                  <label className="flex items-center gap-2 text-sm text-slate-200">
                    <input
                      type="radio"
                      checked={deleteCategoryAction === 'unlink'}
                      onChange={() => setDeleteCategoryAction('unlink')}
                    />
                    Remover vínculo (enviar para "{UNLINK_FALLBACK_CATEGORY}")
                  </label>
                </div>
              ) : null;
            })()}

            <div className="flex gap-3">
              <Button variant="ghost" onClick={closeDeleteCategoryDialog} className="flex-1 h-10 rounded-xl text-slate-400">
                Cancelar
              </Button>
              <Button onClick={handleDeleteCategory} className="flex-1 bg-red-600 hover:bg-red-700 text-white h-10 rounded-xl">
                <Trash2 size={14} className="mr-1" /> Excluir
              </Button>
            </div>
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
