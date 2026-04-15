import { Box, ClipboardList, House, LogOut, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAdmin';
import { useCatalog } from '@/hooks/useCatalog';
import { useOrders } from '@/hooks/useOrders';
import { useStockManager } from '@/hooks/useStock';

export default function Admin() {
  const { isAuthenticated, logout } = useAuth();
  const { data: catalog, loading: catalogLoading } = useCatalog();
  const { orders } = useOrders();
  const stock = useStockManager();

  if (!isAuthenticated) {
    window.location.href = '/login';
    return null;
  }

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

  const totalProducts = Object.values(catalog.categorias).flat().length;
  const pendingOrders = orders.filter((order) => order.status === 'pendente').length;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="bg-slate-800/80 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
              title="Voltar para início"
              aria-label="Voltar para início"
            >
              <House size={16} />
            </a>
            <h1 className="text-lg font-bold text-white">Administrativo</h1>
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

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-3">
            <p className="text-xs text-slate-400">Produtos</p>
            <p className="text-xl font-bold">{totalProducts}</p>
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

        <p className="text-sm text-slate-300">Escolha uma área para começar</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <a
            href="/admin/estoque"
            className="group relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/70 p-5 text-left transition-all duration-300 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-700/20 hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-900/40">
                <Box size={20} className="text-white" />
              </div>
              <h2 className="text-lg font-bold text-white">Gestão de Estoque</h2>
            </div>
            <p className="text-sm text-slate-300">Atualize quantidades, edite produtos e cadastre novos itens.</p>
            <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-emerald-500/15 to-transparent rounded-bl-full -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-500" />
          </a>

          <a
            href="/admin/criar-pedido"
            className="group relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/70 p-5 text-left transition-all duration-300 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-700/20 hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/40">
                <ShoppingCart size={20} className="text-white" />
              </div>
              <h2 className="text-lg font-bold text-white">Criar Pedido</h2>
            </div>
            <p className="text-sm text-slate-300">Monte pedidos com produtos do estoque ou itens manuais.</p>
            <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-blue-500/15 to-transparent rounded-bl-full -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-500" />
          </a>

          <a
            href="/admin/pedidos"
            className="group relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/70 p-5 text-left transition-all duration-300 hover:border-violet-500 hover:shadow-lg hover:shadow-violet-700/20 hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-900/40">
                <ClipboardList size={20} className="text-white" />
              </div>
              <h2 className="text-lg font-bold text-white">Pedidos</h2>
            </div>
            <p className="text-sm text-slate-300">Consulte histórico, atualize status e exclua pedidos.</p>
            <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-violet-500/15 to-transparent rounded-bl-full -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-500" />
          </a>
        </div>
      </div>
    </div>
  );
}
