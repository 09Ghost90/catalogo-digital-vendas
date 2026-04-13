import { Minus, Plus, Trash2, ShoppingCart, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { PAYMENT_OPTIONS, type CartActions, type PaymentMethod } from '@/hooks/useCart';

interface CartDrawerProps {
  cart: CartActions;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  whatsappNumber: string;
}

export default function CartDrawer({ cart, open, onOpenChange, whatsappNumber }: CartDrawerProps) {
  const handleSendOrder = () => {
    const message = cart.getWhatsAppMessage();
    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/55${whatsappNumber.replace(/\D/g, '')}?text=${encodedMessage}`;
    window.open(url, '_blank');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col bg-white dark:bg-slate-900 p-0">
        <SheetHeader className="border-b border-gray-200 dark:border-slate-700 p-4 pb-3">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <ShoppingCart size={20} className="text-blue-600" />
            Meu Carrinho
          </SheetTitle>
          <SheetDescription>
            {cart.items.length === 0
              ? 'Seu carrinho está vazio'
              : `${cart.getItemCount()} item${cart.getItemCount() !== 1 ? 's' : ''} no carrinho`}
          </SheetDescription>
        </SheetHeader>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto py-3 px-4 space-y-2.5">
          {cart.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 gap-3">
              <ShoppingCart size={48} strokeWidth={1.2} />
              <p className="text-sm">Adicione produtos para começar</p>
            </div>
          ) : (
            cart.items.map((item) => {
              const price = item.tipo === 'embalagem' ? item.preco_embalagem : item.preco_unitario;
              return (
                <div
                  key={`${item.categoria}-${item.id}`}
                  className="flex gap-3 p-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30 hover:shadow-sm transition-all"
                >
                  {/* Thumbnail */}
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-gradient-to-br from-blue-100 to-green-100 dark:from-slate-700 dark:to-slate-600 flex-shrink-0 flex items-center justify-center">
                    {item.imagens && item.imagens.length > 0 ? (
                      <img src={item.imagens[0]} alt={item.nome} className="w-full h-full object-cover" />
                    ) : (
                      <ShoppingCart size={16} className="text-gray-300" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                      {item.nome}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      R$ {price.toFixed(2)} / {item.unidade}
                    </p>

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => cart.updateQuantity(item.categoria, item.id, item.quantidade - 1)}
                          className="w-7 h-7 rounded-full flex items-center justify-center bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-7 text-center text-sm font-semibold text-gray-800 dark:text-gray-200">
                          {item.quantidade}
                        </span>
                        <button
                          onClick={() => cart.updateQuantity(item.categoria, item.id, item.quantidade + 1)}
                          className="w-7 h-7 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-600 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-blue-600">
                          R$ {(price * item.quantidade).toFixed(2)}
                        </span>
                        <button
                          onClick={() => cart.removeFromCart(item.categoria, item.id)}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {cart.items.length > 0 && (
          <SheetFooter className="border-t border-gray-200 dark:border-slate-700 pt-3 pb-4 px-4 gap-3 flex-col">
            {/* Payment Method */}
            <div className="w-full">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Forma de Pagamento</p>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => cart.setPaymentMethod(
                      cart.paymentMethod === option.value ? '' as PaymentMethod : option.value
                    )}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      cart.paymentMethod === option.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 shadow-sm'
                        : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:border-blue-300 dark:hover:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <span className="text-base">{option.icon}</span>
                    <span className="truncate">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between w-full px-1 pt-2">
              <span className="text-base font-bold text-gray-800 dark:text-gray-100">Total:</span>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                R$ {cart.getTotal().toFixed(2)}
              </span>
            </div>

            {/* Actions */}
            <Button
              onClick={handleSendOrder}
              className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-base font-semibold flex items-center justify-center gap-2 rounded-xl shadow-lg shadow-green-600/20"
            >
              <MessageCircle size={20} />
              Enviar Pedido via WhatsApp
            </Button>

            <Button
              variant="outline"
              onClick={() => cart.clearCart()}
              className="w-full text-red-500 border-red-200 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl"
            >
              <Trash2 size={14} className="mr-2" />
              Limpar Carrinho
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
