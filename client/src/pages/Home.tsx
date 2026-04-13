import { useState, useMemo } from 'react';
import { Search, Filter, MessageCircle, ChevronDown, ShoppingCart, Plus, X, SlidersHorizontal, UserPlus, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import WhatsAppButton from '@/components/WhatsAppButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import CartDrawer from '@/components/CartDrawer';
import { useCart } from '@/hooks/useCart';
import { useCustomer } from '@/hooks/useCustomer';
import type { CustomerProfile } from '@/hooks/useCustomer';
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

interface CatalogData {
  empresa: string;
  whatsapp: string;
  categoryImages: Record<string, string>;
  categorias: Record<string, Produto[]>;
}

function loadCatalog(): CatalogData {
  try {
    const saved = localStorage.getItem('admin_products_override');
    if (saved) return JSON.parse(saved);
  } catch {}
  return catalogData as CatalogData;
}

const data: CatalogData = loadCatalog();

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'nome' | 'preco'>('nome');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const cart = useCart(data.whatsapp);
  const customer = useCustomer();
  const allCategories = Object.keys(data.categorias).sort();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState<CustomerProfile>(customer.profile);

  const filteredProducts = useMemo(() => {
    let products: Produto[] = [];
    const categoriesToShow =
      selectedCategories.length === 0 ? allCategories : selectedCategories;

    categoriesToShow.forEach((cat) => {
      products = [...products, ...(data.categorias[cat] || [])];
    });

    if (searchTerm) {
      products = products.filter(
        (p) =>
          p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.nome_completo.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (sortBy === 'preco') {
      products.sort((a, b) => a.preco_unitario - b.preco_unitario);
    } else {
      products.sort((a, b) => a.nome.localeCompare(b.nome));
    }

    return products;
  }, [searchTerm, selectedCategories, sortBy]);

  const groupedByCategory = useMemo(() => {
    const grouped: Record<string, Produto[]> = {};
    filteredProducts.forEach((product) => {
      if (!grouped[product.categoria]) {
        grouped[product.categoria] = [];
      }
      grouped[product.categoria].push(product);
    });
    return grouped;
  }, [filteredProducts]);

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleAddToCart = (product: Produto) => {
    cart.addToCart(product);
    toast.success(`${product.nome.substring(0, 25)}… adicionado!`, {
      duration: 1500,
      position: 'bottom-center',
    });
  };

  const handleWhatsApp = (product: Produto) => {
    const message = `Olá! Gostaria de mais informações sobre: *${product.nome_completo}*\n\nPreço unitário: R$ ${product.preco_unitario.toFixed(2)}\nPreço por embalagem: R$ ${product.preco_embalagem.toFixed(2)}\nUnidade: ${product.unidade}`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/55${data.whatsapp.replace(/\D/g, '')}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleSaveProfile = () => {
    if (!profileForm.nome.trim() || !profileForm.contato.trim() || !profileForm.endereco.trim()) {
      toast.error('Nome, contato e endereço são obrigatórios');
      return;
    }
    customer.saveProfile(profileForm);
    setProfileModalOpen(false);
    toast.success('Perfil salvo com sucesso!');
  };

  const openProfileModal = () => {
    setProfileForm(customer.profile);
    setProfileModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 transition-colors duration-300">
      {/* Profile Modal */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setProfileModalOpen(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <UserPlus size={18} className="text-blue-600" />
                {customer.hasProfile ? 'Editar Perfil' : 'Criar Perfil de Cliente'}
              </h2>
              <button onClick={() => setProfileModalOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Seus dados serão preenchidos automaticamente na hora do pedido.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome (ou nome da empresa) *</label>
                <Input value={profileForm.nome} onChange={(e) => setProfileForm({...profileForm, nome: e.target.value})} placeholder="Seu nome" className="rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contato (WhatsApp) *</label>
                <Input value={profileForm.contato} onChange={(e) => setProfileForm({...profileForm, contato: e.target.value})} placeholder="(00) 00000-0000" className="rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Endereço de entrega *</label>
                <textarea value={profileForm.endereco} onChange={(e) => setProfileForm({...profileForm, endereco: e.target.value})} placeholder="Rua, número, bairro, cidade..." rows={2} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Horário preferencial de entrega</label>
                <Input value={profileForm.horarioEntrega} onChange={(e) => setProfileForm({...profileForm, horarioEntrega: e.target.value})} placeholder="Ex: 8h às 12h" className="rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pessoa responsável pelo recebimento</label>
                <Input value={profileForm.responsavelRecebimento} onChange={(e) => setProfileForm({...profileForm, responsavelRecebimento: e.target.value})} placeholder="Com quem tratar" className="rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
                <textarea value={profileForm.observacoes} onChange={(e) => setProfileForm({...profileForm, observacoes: e.target.value})} placeholder="Informações adicionais..." rows={2} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <Button variant="outline" onClick={() => setProfileModalOpen(false)} className="flex-1 rounded-xl">Cancelar</Button>
              <Button onClick={handleSaveProfile} className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white">Salvar Perfil</Button>
            </div>
            {customer.hasProfile && (
              <button onClick={() => { customer.clearProfile(); setProfileForm({nome:'',contato:'',endereco:'',horarioEntrega:'',responsavelRecebimento:'',observacoes:''}); toast.success('Perfil removido'); }} className="w-full text-center text-xs text-red-400 hover:text-red-500 mt-3 transition-colors">
                Remover meu perfil
              </button>
            )}
          </div>
        </div>
      )}
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg shadow-sm border-b border-blue-100 dark:border-slate-800 transition-colors duration-300">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <a
                href="/"
                className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
                title="Voltar ao início"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </a>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent truncate">
                  {data.empresa}
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Catálogo Digital de Produtos</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Cart Button */}
              <button
                onClick={() => setCartOpen(true)}
                className="relative p-2 sm:p-2.5 rounded-full bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 transition-colors"
                aria-label="Abrir carrinho"
              >
                <ShoppingCart size={20} className="text-blue-600 dark:text-blue-400" />
                {cart.getItemCount() > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-in zoom-in-50 duration-200">
                    {cart.getItemCount()}
                  </span>
                )}
              </button>
              <ThemeToggle />
            </div>
          </div>

          {/* Profile Banner */}
          <div className="mb-3">
            {customer.hasProfile ? (
              <button
                onClick={openProfileModal}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/10 dark:to-green-900/10 border border-blue-200/50 dark:border-slate-700 hover:shadow-sm transition-all text-left group"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Olá, <span className="font-semibold text-blue-600 dark:text-blue-400">{customer.profile.nome.split(' ')[0]}</span>! 👋
                </span>
                <span className="text-xs text-blue-500 dark:text-blue-400 flex items-center gap-1 group-hover:underline">
                  <Edit3 size={12} /> Editar perfil
                </span>
              </button>
            ) : (
              <button
                onClick={openProfileModal}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/10 dark:to-green-900/10 border border-blue-200/50 dark:border-slate-700 hover:shadow-sm transition-all text-left group"
              >
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium text-blue-600 dark:text-blue-400">Crie seu perfil</span> para agilizar seus pedidos
                </span>
                <span className="text-xs text-blue-500 flex items-center gap-1 group-hover:underline">
                  <UserPlus size={12} /> Criar
                </span>
              </button>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-2.5 sm:top-3 text-gray-400" size={18} />
            <Input
              type="text"
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 py-2 text-sm sm:text-base border-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-blue-500 focus:ring-blue-500 transition-colors rounded-xl h-10 sm:h-11"
            />
          </div>

          {/* Controls */}
          <div className="flex gap-2 items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Mobile Filter Toggle */}
              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className="lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-200 dark:border-slate-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
              >
                <SlidersHorizontal size={16} />
                <span>Filtros</span>
                {selectedCategories.length > 0 && (
                  <span className="w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                    {selectedCategories.length}
                  </span>
                )}
              </button>
              <div className="hidden lg:flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <Filter size={16} />
                <span>
                  {filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'nome' | 'preco')}
              className="px-3 py-2 border border-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="nome">Por Nome</option>
              <option value="preco">Por Preço</option>
            </select>
          </div>
        </div>
      </header>

      {/* Mobile Filter Drawer */}
      {filtersOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setFiltersOpen(false)} />
          <div className="relative bg-white dark:bg-slate-900 w-72 max-w-[80vw] h-full shadow-xl p-5 overflow-y-auto animate-in slide-in-from-left duration-300">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <Filter size={18} className="text-blue-600" />
                Categorias
              </h2>
              <button onClick={() => setFiltersOpen(false)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="space-y-1">
              {allCategories.map((category) => (
                <label
                  key={category}
                  className="flex items-center gap-3 cursor-pointer group p-2 rounded-lg hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category)}
                    onChange={() => toggleCategory(category)}
                    className="w-4 h-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition flex-1">
                    {category}
                  </span>
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
                    {data.categorias[category]?.length || 0}
                  </span>
                </label>
              ))}
            </div>

            {selectedCategories.length > 0 && (
              <Button
                onClick={() => { setSelectedCategories([]); setFiltersOpen(false); }}
                variant="outline"
                size="sm"
                className="w-full mt-4 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl"
              >
                Limpar Filtros
              </Button>
            )}

            <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-100 dark:border-green-900/30">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Fale conosco</p>
              <p className="font-semibold text-green-700 dark:text-green-400 text-sm">{data.whatsapp}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block lg:col-span-1">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-5 sticky top-32 transition-colors duration-300 border border-blue-50 dark:border-slate-800">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Filter size={20} className="text-blue-600" />
                Categorias
              </h2>

              <div className="space-y-1">
                {allCategories.map((category) => (
                  <label
                    key={category}
                    className="flex items-center gap-3 cursor-pointer group p-1.5 rounded-lg hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category)}
                      onChange={() => toggleCategory(category)}
                      className="w-4 h-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                      {category}
                    </span>
                    <span className="ml-auto text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
                      {data.categorias[category]?.length || 0}
                    </span>
                  </label>
                ))}
              </div>

              {selectedCategories.length > 0 && (
                <Button
                  onClick={() => setSelectedCategories([])}
                  variant="outline"
                  size="sm"
                  className="w-full mt-4 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl"
                >
                  Limpar Filtros
                </Button>
              )}

              <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-100 dark:border-green-900/30">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Fale conosco</p>
                <p className="font-semibold text-green-700 dark:text-green-400 text-sm">{data.whatsapp}</p>
              </div>
            </div>
          </aside>

          {/* Produtos */}
          <div className="lg:col-span-3">
            {/* Mobile product count */}
            <p className="lg:hidden text-sm text-gray-500 dark:text-gray-400 mb-3">
              {filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''}
            </p>

            {Object.keys(groupedByCategory).length === 0 ? (
              <div className="text-center py-16">
                <Search size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-lg">Nenhum produto encontrado</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Tente buscar por outro termo</p>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {Object.entries(groupedByCategory).map(([category, products]) => (
                  <div key={category} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm overflow-hidden transition-colors duration-300 border border-blue-50 dark:border-slate-800">
                    {/* Category Header */}
                    <button
                      onClick={() =>
                        setExpandedCategory(
                          expandedCategory === category ? null : category
                        )
                      }
                      className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-slate-800 dark:to-slate-700/50 border-b border-blue-100 dark:border-slate-800 flex items-center justify-between hover:from-blue-100 hover:to-green-100 dark:hover:from-slate-700 dark:hover:to-slate-600 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-white dark:border-slate-600 shadow-sm flex-shrink-0">
                          <img
                            src={data.categoryImages[category]}
                            alt={category}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="text-left">
                          <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm sm:text-base">{category}</h3>
                          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                            {products.length} produto{products.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <ChevronDown
                        size={20}
                        className={`text-blue-600 transition-transform duration-300 ${
                          expandedCategory === category ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {/* Products Grid */}
                    {expandedCategory === category && (
                      <div className="p-3 sm:p-6 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {products.map((product) => (
                          <div
                            key={`${product.categoria}-${product.id}`}
                            className="border border-blue-50 dark:border-slate-800 rounded-xl p-3 sm:p-4 hover:shadow-xl hover:border-blue-200 dark:hover:border-slate-600 transition-all duration-300 group bg-white dark:bg-slate-900/50"
                          >
                            {/* Product Image */}
                            <div className="w-full h-28 sm:h-40 bg-gradient-to-br from-blue-50 to-green-50 dark:from-slate-800 dark:to-slate-700 rounded-xl mb-2 sm:mb-3 flex items-center justify-center overflow-hidden">
                              <img
                                src={product.imagens && product.imagens.length > 0 ? product.imagens[0] : data.categoryImages[category]}
                                alt={product.nome}
                                className={`transition-all duration-300 ${product.imagens && product.imagens.length > 0 ? 'w-full h-full object-cover group-hover:scale-105' : 'w-16 sm:w-20 h-16 sm:h-20 object-contain opacity-40 group-hover:opacity-60'}`}
                              />
                            </div>

                            {/* Product Info */}
                            <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-xs sm:text-sm mb-1 line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem]">
                              {product.nome}
                            </h4>

                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 sm:mb-3">
                              {product.unidade}
                            </p>

                            {/* Preços */}
                            <div className="bg-gradient-to-br from-blue-50 to-blue-50/30 dark:from-slate-800/80 dark:to-slate-800/40 rounded-xl p-2 sm:p-3 mb-2 sm:mb-3">
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Unitário</p>
                              <p className="text-lg sm:text-xl font-bold text-blue-600">
                                R$ {product.preco_unitario.toFixed(2)}
                              </p>
                              {product.preco_embalagem !== product.preco_unitario && (
                                <>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 mb-0.5">
                                    Embalagem
                                  </p>
                                  <p className="text-base sm:text-lg font-semibold text-green-600">
                                    R$ {product.preco_embalagem.toFixed(2)}
                                  </p>
                                </>
                              )}
                            </div>

                            {/* CTA Buttons */}
                            <div className="flex gap-1.5 sm:gap-2">
                              <Button
                                onClick={() => handleAddToCart(product)}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1 sm:gap-2 rounded-xl h-9 sm:h-10 text-xs sm:text-sm font-medium shadow-sm"
                              >
                                <Plus size={14} />
                                <span className="hidden sm:inline">Adicionar</span>
                                <span className="sm:hidden">Add</span>
                              </Button>
                              <Button
                                onClick={() => handleWhatsApp(product)}
                                variant="outline"
                                className="w-9 h-9 sm:w-10 sm:h-10 p-0 border-green-200 dark:border-green-900/30 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/10 rounded-xl flex-shrink-0"
                                title="Solicitar via WhatsApp"
                              >
                                <MessageCircle size={14} />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-blue-600 to-green-600 dark:from-blue-900 dark:to-green-900 text-white py-6 sm:py-8 mt-8 sm:mt-12 transition-colors duration-300">
        <div className="container mx-auto px-4 text-center">
          <p className="font-semibold mb-1 sm:mb-2">{data.empresa}</p>
          <p className="text-xs sm:text-sm opacity-90">
            Entre em contato conosco via WhatsApp para mais informações
          </p>
          <p className="text-xs sm:text-sm opacity-75 mt-2">© 2025 {data.empresa}. Todos os direitos reservados.</p>
        </div>
      </footer>

      {/* Floating Cart Button */}
      {cart.getItemCount() > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-20 right-4 sm:right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 sm:px-5 py-2.5 sm:py-3 shadow-xl shadow-blue-600/30 hover:shadow-2xl z-40 flex items-center gap-2 transition-all duration-300 animate-in slide-in-from-bottom-4"
        >
          <ShoppingCart size={18} />
          <span className="font-semibold text-sm">
            {cart.getItemCount()}
          </span>
          <span className="text-blue-200">|</span>
          <span className="font-bold text-sm">
            R$ {cart.getTotal().toFixed(2)}
          </span>
        </button>
      )}

      {/* WhatsApp Floating Button */}
      <WhatsAppButton
        phoneNumber={data.whatsapp}
        message="Olá! Gostaria de informações sobre seus produtos. Qual é o catálogo disponível?"
      />

      {/* Cart Drawer */}
      <CartDrawer
        cart={cart}
        open={cartOpen}
        onOpenChange={setCartOpen}
        whatsappNumber={data.whatsapp}
        customerProfile={customer.profile}
      />
    </div>
  );
}
