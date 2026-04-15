import { useState, useMemo } from 'react';
import { Search, Filter, MessageCircle, ChevronDown, ShoppingCart, Plus, X, SlidersHorizontal, UserPlus, Edit3, Package, Eye, Phone, UserCircle2, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import WhatsAppButton from '@/components/WhatsAppButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import CartDrawer from '@/components/CartDrawer';
import Logo from '@/components/Logo';
import { useCart } from '@/hooks/useCart';
import { useCustomer } from '@/hooks/useCustomer';
import type { CustomerProfile } from '@/hooks/useCustomer';
import { useCatalog } from '@/hooks/useCatalog';
import type { Produto } from '@/hooks/useCatalog';
import { toast } from 'sonner';
import { useLocation } from 'wouter';

export default function Home() {
  const [location] = useLocation();
  const { data, loading: catalogLoading, error: catalogError } = useCatalog();
  const [searchTerm, setSearchTerm] = useState('');
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'nome' | 'preco'>('nome');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const cart = useCart(data?.whatsapp || '');
  const customer = useCustomer();
  const allCategories = Object.keys(data?.categorias || {}).sort();
  const isCategoriaRoute = location === '/categoria' || location.startsWith('/categoria?');
  const normalizedCategorySearch = categorySearchTerm.trim().toLowerCase();
  const visibleCategories = useMemo(() => {
    if (!normalizedCategorySearch) return allCategories;
    return allCategories.filter((category) =>
      category.toLowerCase().includes(normalizedCategorySearch)
    );
  }, [allCategories, normalizedCategorySearch]);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [simpleLoginOpen, setSimpleLoginOpen] = useState(false);
  const [simpleLoginContact, setSimpleLoginContact] = useState('');
  const [profileForm, setProfileForm] = useState<CustomerProfile>(customer.profile);

  const filteredProducts = useMemo(() => {
    if (!data) return [];
    let products: Produto[] = [];
    const selectedVisibleCategories = selectedCategories.filter((category) =>
      visibleCategories.includes(category)
    );
    const categoriesToShow =
      selectedVisibleCategories.length === 0
        ? visibleCategories
        : selectedVisibleCategories;

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
  }, [data, searchTerm, selectedCategories, sortBy, visibleCategories]);

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

  // Loading state — AFTER all hooks
  if (catalogLoading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Carregando catálogo...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (catalogError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 p-4">
        <div className="text-center max-w-md">
          <Package size={48} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Erro ao carregar</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{catalogError}</p>
        </div>
      </div>
    );
  }

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

  const handleSimpleLogin = () => {
    if (!simpleLoginContact.trim()) {
      toast.error('Informe seu WhatsApp para continuar');
      return;
    }

    if (!customer.hasProfile) {
      setSimpleLoginOpen(false);
      setSimpleLoginContact('');
      toast.message('Nenhum perfil salvo neste dispositivo. Crie seu perfil para continuar.');
      openProfileModal();
      return;
    }

    const inputContact = simpleLoginContact.replace(/\D/g, '');
    const savedContact = customer.profile.contato.replace(/\D/g, '');

    if (inputContact && inputContact === savedContact) {
      setSimpleLoginOpen(false);
      setSimpleLoginContact('');
      toast.success('Perfil carregado com sucesso!');
      return;
    }

    toast.error('Contato não encontrado neste dispositivo');
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

      {/* Simple Customer Login Modal */}
      {simpleLoginOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSimpleLoginOpen(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <LogIn size={18} className="text-blue-600" />
                Já sou cliente
              </h2>
              <button
                onClick={() => setSimpleLoginOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
                aria-label="Fechar login simples"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Digite seu WhatsApp para acessar rapidamente.
            </p>
            <Input
              value={simpleLoginContact}
              onChange={(e) => setSimpleLoginContact(e.target.value)}
              placeholder="(00) 00000-0000"
              className="rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            />
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setSimpleLoginOpen(false)}
                className="flex-1 rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSimpleLogin}
                className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
              >
                Entrar
              </Button>
            </div>
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
                title="Voltar ao início"
              >
                <Logo variant="horizontal" size={40} />
              </a>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="relative p-2 sm:p-2.5 rounded-full bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md hover:shadow-blue-500/10 transition-all duration-200 hover:-translate-y-0.5"
                    aria-label="Abrir opções de perfil"
                  >
                    <UserCircle2 size={20} />
                    {customer.hasProfile && (
                      <span className="absolute -top-0.5 -right-0.5 block w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-52 rounded-xl border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  <DropdownMenuItem
                    onClick={openProfileModal}
                    className="rounded-lg text-gray-700 dark:text-gray-200 cursor-pointer"
                  >
                    {customer.hasProfile ? (
                      <>
                        <Edit3 size={16} className="text-blue-600" />
                        Editar perfil
                      </>
                    ) : (
                      <>
                        <UserPlus size={16} className="text-blue-600" />
                        Criar perfil
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSimpleLoginOpen(true)}
                    className="rounded-lg text-gray-700 dark:text-gray-200 cursor-pointer"
                  >
                    <LogIn size={16} className="text-emerald-600" />
                    Já sou cliente (login simples)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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

          {/* Search Bar */}
          <div className="relative mb-3">
            <Search className="absolute left-3.5 top-2.5 sm:top-3 text-gray-400" size={18} />
            <Input
              type="text"
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 py-2 text-sm sm:text-base border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-blue-500 focus:ring-blue-500/20 transition-all rounded-2xl h-10 sm:h-11 shadow-sm"
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
              {isCategoriaRoute && (
                <div className="mb-3">
                  <Input
                    type="text"
                    value={categorySearchTerm}
                    onChange={(e) => setCategorySearchTerm(e.target.value)}
                    placeholder="Filtrar categorias..."
                    className="h-9 rounded-xl border-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              )}

              {visibleCategories.map((category) => (
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

            {(selectedCategories.length > 0 || categorySearchTerm) && (
              <Button
                onClick={() => {
                  setSelectedCategories([]);
                  setCategorySearchTerm('');
                  setFiltersOpen(false);
                }}
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
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-5 sticky top-32 transition-colors duration-300 border border-gray-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Filter size={20} className="text-blue-600" />
                Categorias
              </h2>

              {isCategoriaRoute && (
                <div className="mb-3">
                  <Input
                    type="text"
                    value={categorySearchTerm}
                    onChange={(e) => setCategorySearchTerm(e.target.value)}
                    placeholder="Filtrar categorias..."
                    className="h-9 rounded-xl border-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              )}

              <div className="space-y-0.5">
                {visibleCategories.map((category) => (
                  <label
                    key={category}
                    className="flex items-center gap-3 cursor-pointer group px-2 py-2 rounded-lg hover:bg-blue-50/60 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category)}
                      onChange={() => toggleCategory(category)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition truncate">
                      {category}
                    </span>
                    <span className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-semibold tabular-nums">
                      {data.categorias[category]?.length || 0}
                    </span>
                  </label>
                ))}
              </div>

              {(selectedCategories.length > 0 || categorySearchTerm) && (
                <Button
                  onClick={() => {
                    setSelectedCategories([]);
                    setCategorySearchTerm('');
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full mt-4 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl"
                >
                  Limpar Filtros
                </Button>
              )}

              <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-100 dark:border-green-900/30">
                <div className="flex items-center gap-2 mb-1">
                  <Phone size={14} className="text-green-600 dark:text-green-400" />
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Fale conosco</p>
                </div>
                <p className="font-bold text-green-700 dark:text-green-400 text-base tracking-wide">{data.whatsapp}</p>
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
              <div className="space-y-6">
                {/* Category Card Grid */}
                {!expandedCategory && (
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
                    {Object.entries(groupedByCategory).map(([category, products]) => (
                      <button
                        key={category}
                        onClick={() => setExpandedCategory(category)}
                        className="group bg-white dark:bg-slate-900 rounded-2xl shadow-sm overflow-hidden transition-all duration-300 border border-gray-100 dark:border-slate-800 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 hover:border-blue-200 dark:hover:border-blue-800 text-left flex flex-col"
                      >
                        {/* Category Image — 70% of card */}
                        <div className="w-full aspect-[4/3] overflow-hidden bg-gradient-to-br from-blue-50 to-green-50 dark:from-slate-800 dark:to-slate-700 relative">
                          {data.categoryImages[category] ? (
                            <img
                              src={data.categoryImages[category]}
                              alt={category}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-blue-200 dark:text-slate-600">
                              <Package size={48} />
                            </div>
                          )}
                          {/* Products count badge */}
                          <span className="absolute bottom-2 right-2 text-[10px] sm:text-xs font-semibold bg-black/60 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
                            {products.length} produto{products.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {/* Title + CTA */}
                        <div className="p-3 sm:p-4 flex flex-col items-center gap-2 flex-1">
                          <h3 className="font-bold text-gray-800 dark:text-gray-100 text-xs sm:text-sm text-center leading-tight">
                            {category}
                          </h3>
                          <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-full group-hover:bg-blue-600 group-hover:text-white dark:group-hover:bg-blue-600 transition-colors duration-300 mt-auto">
                            <Eye size={12} /> Explorar
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Expanded Category → Products Grid */}
                {expandedCategory && groupedByCategory[expandedCategory] && (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm overflow-hidden border border-gray-100 dark:border-slate-800">
                    {/* Category header bar */}
                    <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-slate-800 dark:to-slate-700/50 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white dark:border-slate-600 shadow-sm flex-shrink-0">
                          {data.categoryImages[expandedCategory] ? (
                            <img src={data.categoryImages[expandedCategory]} alt={expandedCategory} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-blue-50 dark:bg-slate-800 flex items-center justify-center text-blue-300"><Package size={20} /></div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm sm:text-base">{expandedCategory}</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{groupedByCategory[expandedCategory].length} produto{groupedByCategory[expandedCategory].length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => setExpandedCategory(null)}
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-xs border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 gap-1"
                      >
                        <ChevronDown size={14} className="rotate-90" /> Voltar
                      </Button>
                    </div>

                    {/* Products grid */}
                    <div className="p-3 sm:p-6 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      {groupedByCategory[expandedCategory].map((product) => (
                        <div
                          key={`${product.categoria}-${product.id}`}
                          className="border border-gray-100 dark:border-slate-800 rounded-xl p-3 sm:p-4 hover:shadow-xl hover:border-blue-200 dark:hover:border-slate-600 transition-all duration-300 group bg-white dark:bg-slate-900/50"
                        >
                          {/* Product Image */}
                          <div className="w-full h-28 sm:h-40 bg-gradient-to-br from-blue-50 to-green-50 dark:from-slate-800 dark:to-slate-700 rounded-xl mb-2 sm:mb-3 flex items-center justify-center overflow-hidden">
                            <img
                              src={product.imagens && product.imagens.length > 0 ? product.imagens[0] : data.categoryImages[expandedCategory]}
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
                          <div className="bg-gradient-to-br from-blue-50 to-blue-50/30 dark:from-slate-800/80 dark:to-slate-800/40 rounded-xl p-2 sm:p-3 mb-2 sm:mb-3 text-center">
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
                  </div>
                )}
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
