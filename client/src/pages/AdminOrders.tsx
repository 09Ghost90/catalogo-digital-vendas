import { ArrowLeft, ClipboardList, LogOut, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAdmin';
import { useOrders } from '@/hooks/useOrders';
import type { OrderStatus } from '@/hooks/useOrders';
import { toast } from 'sonner';

export default function AdminOrders() {
  const { isAuthenticated, logout } = useAuth();
  const { orders, updateStatus, removeOrder } = useOrders();

  if (!isAuthenticated) {
    window.location.href = '/login';
    return null;
  }

  const handleDeleteOrder = (orderCode: string) => {
    const confirmed = window.confirm('Deseja realmente excluir este pedido?');
    if (!confirmed) return;

    removeOrder(orderCode);
    toast.success(`Pedido ${orderCode} removido.`);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="bg-slate-800/80 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/admin" className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1">
              <ArrowLeft size={14} />
              Administrativo
            </a>
            <h1 className="text-lg font-bold text-white">Pedidos</h1>
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

      <div className="max-w-7xl mx-auto px-4 py-6">
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
                      <span className="text-xs text-slate-400">{new Date(order.createdAt).toLocaleString('pt-BR')}</span>
                      <select
                        value={order.status}
                        onChange={(e) => updateStatus(order.code, e.target.value as OrderStatus)}
                        className="bg-slate-900 border border-slate-700 text-xs rounded-lg px-2 py-1"
                      >
                        <option value="pendente">pendente</option>
                        <option value="concluido">concluído</option>
                      </select>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteOrder(order.code)}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                        title="Excluir pedido"
                      >
                        <Trash2 size={14} />
                      </Button>
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
      </div>
    </div>
  );
}
