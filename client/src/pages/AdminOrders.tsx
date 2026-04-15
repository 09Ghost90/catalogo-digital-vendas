import { ArrowLeft, LogOut, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAdmin';
import { useOrders } from '@/hooks/useOrders';
import type { AdminOrder, OrderStatus } from '@/hooks/useOrders';
import { toast } from 'sonner';

function WhatsAppIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.5 3.5A11.86 11.86 0 0 0 12.05 0C5.5 0 .14 5.35.14 11.9c0 2.1.55 4.15 1.6 5.96L0 24l6.3-1.64a11.88 11.88 0 0 0 5.74 1.47h.01c6.55 0 11.9-5.35 11.9-11.9 0-3.18-1.24-6.16-3.45-8.43ZM12.05 21.8h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.73.97 1-3.64-.23-.37a9.9 9.9 0 0 1-1.52-5.28c0-5.46 4.44-9.9 9.9-9.9 2.64 0 5.12 1.03 6.98 2.9a9.82 9.82 0 0 1 2.9 7c0 5.45-4.44 9.9-9.9 9.9Zm5.43-7.42c-.3-.15-1.77-.87-2.04-.98-.27-.1-.47-.15-.67.16-.2.3-.77.98-.95 1.18-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.5a9.08 9.08 0 0 1-1.67-2.08c-.18-.3-.02-.46.13-.62.14-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.38-.03-.53-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.5l-.57-.01c-.2 0-.53.08-.8.38-.27.3-1.04 1.01-1.04 2.46s1.07 2.86 1.22 3.06c.15.2 2.1 3.2 5.08 4.49.71.31 1.27.49 1.7.63.71.23 1.35.2 1.85.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.18-1.42-.08-.11-.28-.18-.58-.33Z" />
    </svg>
  );
}

function formatWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('55') ? digits : `55${digits}`;
}

function buildOrderWhatsAppMessage(order: AdminOrder): string {
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

  const handleShareOrder = (order: AdminOrder) => {
    const targetPhone = formatWhatsAppPhone(order.customerTelefone);
    const message = buildOrderWhatsAppMessage(order);
    const shareUrl = targetPhone
      ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(shareUrl, '_blank');
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
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleShareOrder(order)}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-green-400"
                        title="Compartilhar no WhatsApp"
                      >
                        <WhatsAppIcon size={15} />
                      </Button>
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
