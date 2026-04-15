import { useState, useEffect } from 'react';
import { Minus, Plus, Trash2, ShoppingCart, MessageCircle, ArrowLeft, User, Phone, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { PAYMENT_OPTIONS, type CartActions, type PaymentMethod, type CustomerCheckoutData } from '@/hooks/useCart';
import type { CustomerProfile } from '@/hooks/useCustomer';

interface CartDrawerProps {
  cart: CartActions;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  whatsappNumber: string;
  customerProfile?: CustomerProfile | null;
}

export default function CartDrawer({ cart, open, onOpenChange, whatsappNumber, customerProfile }: CartDrawerProps) {
  const [step, setStep] = useState<'cart' | 'checkout'>('cart');
  const [checkoutData, setCheckoutData] = useState<CustomerCheckoutData>({
    nome: '',
    contato: '',
    endereco: '',
  });
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  // Pre-fill from profile when drawer opens
  useEffect(() => {
    if (open && customerProfile && customerProfile.nome) {
      setCheckoutData({
        nome: customerProfile.nome,
        contato: customerProfile.contato,
        endereco: customerProfile.endereco,
      });
    }
  }, [open, customerProfile]);

  // Reset step when drawer closes
  useEffect(() => {
    if (!open) {
      setStep('cart');
      setErrors({});
    }
  }, [open]);

  const validateCheckout = (): boolean => {
    const newErrors: Record<string, boolean> = {};
    if (!checkoutData.nome.trim()) newErrors.nome = true;
    if (!checkoutData.contato.trim()) newErrors.contato = true;
    if (!checkoutData.endereco.trim()) newErrors.endereco = true;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProceedToCheckout = () => {
    setStep('checkout');
  };

  const handleSendOrder = () => {
    if (!validateCheckout()) return;

    const message = cart.getWhatsAppMessage(checkoutData);
    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/55${whatsappNumber.replace(/\D/g, '')}?text=${encodedMessage}`;
    window.open(url, '_blank');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col bg-white dark:bg-slate-900 p-0">
        <SheetHeader className="border-b border-gray-200 dark:border-slate-700 p-4 pb-3">
          <SheetTitle className="flex items-center gap-2 text-lg">
            {step === 'checkout' && (
              <button
                onClick={() => setStep('cart')}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <ShoppingCart size={20} className="text-blue-600" />
            {step === 'cart' ? 'Meu Carrinho' : 'Dados para Entrega'}
          </SheetTitle>
          <SheetDescription>
            {step === 'cart'
              ? cart.items.length === 0
                ? 'Seu carrinho está vazio'
                : `${cart.getItemCount()} item${cart.getItemCount() !== 1 ? 's' : ''} no carrinho`
              : 'Preencha seus dados para finalizar o pedido'}
          </SheetDescription>
        </SheetHeader>

        {step === 'cart' ? (
          <>
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
                              onClick={() => cart.updateQuantity(item.categoria, item.id, item.quantidade - item.passo)}
                              className="w-7 h-7 rounded-full flex items-center justify-center bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="w-7 text-center text-sm font-semibold text-gray-800 dark:text-gray-200">
                              {item.quantidade}
                            </span>
                            <button
                              onClick={() => cart.updateQuantity(item.categoria, item.id, item.quantidade + item.passo)}
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

            {/* Footer - Step 1 */}
            {cart.items.length > 0 && (
              <SheetFooter className="border-t border-gray-200 dark:border-slate-700 pt-3 pb-4 px-4 gap-3 flex-col">
                {/* Payment Method */}
                <div className="w-full">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Forma de Pagamento</p>
                  <select
                    value={cart.paymentMethod}
                    onChange={(e) => cart.setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-medium bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  >
                    <option value="">Selecione uma forma de pagamento</option>
                    {PAYMENT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Total */}
                <div className="flex items-center justify-between w-full px-1 pt-2">
                  <span className="text-base font-bold text-gray-800 dark:text-gray-100">Total:</span>
                  <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                    R$ {cart.getTotal().toFixed(2)}
                  </span>
                </div>

                {/* Proceed to checkout */}
                <Button
                  onClick={handleProceedToCheckout}
                  className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-base font-semibold flex items-center justify-center gap-2 rounded-xl shadow-lg shadow-green-600/20"
                >
                  <MessageCircle size={20} />
                  Finalizar Pedido
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
          </>
        ) : (
          <>
            {/* Checkout Form - Step 2 */}
            <div className="flex-1 overflow-y-auto py-4 px-4 space-y-4">
              {/* Auto-fill notice */}
              {customerProfile && customerProfile.nome && (
                <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/20 text-green-700 dark:text-green-400 text-xs">
                  Dados preenchidos automaticamente a partir do perfil do cliente.
                </div>
              )}

              {/* Name */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  <User size={14} />
                  Nome *
                </label>
                <Input
                  value={checkoutData.nome}
                  onChange={(e) => {
                    setCheckoutData({ ...checkoutData, nome: e.target.value });
                    if (errors.nome) setErrors({ ...errors, nome: false });
                  }}
                  placeholder="Seu nome completo"
                  className={`rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white ${errors.nome ? 'border-red-400 ring-1 ring-red-400' : ''}`}
                  required
                />
                {errors.nome && <p className="text-xs text-red-500 mt-1">Nome é obrigatório</p>}
              </div>

              {/* Contact */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  <Phone size={14} />
                  Contato (WhatsApp) *
                </label>
                <Input
                  value={checkoutData.contato}
                  onChange={(e) => {
                    setCheckoutData({ ...checkoutData, contato: e.target.value });
                    if (errors.contato) setErrors({ ...errors, contato: false });
                  }}
                  placeholder="(00) 00000-0000"
                  className={`rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white ${errors.contato ? 'border-red-400 ring-1 ring-red-400' : ''}`}
                  required
                />
                {errors.contato && <p className="text-xs text-red-500 mt-1">Contato é obrigatório</p>}
              </div>

              {/* Address */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  <MapPin size={14} />
                  Endereço de Entrega *
                </label>
                <textarea
                  value={checkoutData.endereco}
                  onChange={(e) => {
                    setCheckoutData({ ...checkoutData, endereco: e.target.value });
                    if (errors.endereco) setErrors({ ...errors, endereco: false });
                  }}
                  placeholder="Rua, número, bairro, cidade..."
                  rows={3}
                  className={`w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${errors.endereco ? 'border-red-400 ring-1 ring-red-400' : ''}`}
                  required
                />
                {errors.endereco && <p className="text-xs text-red-500 mt-1">Endereço é obrigatório</p>}
              </div>

              {/* Order Summary */}
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">RESUMO DO PEDIDO</p>
                <div className="space-y-1">
                  {cart.items.map((item) => {
                    const price = item.tipo === 'embalagem' ? item.preco_embalagem : item.preco_unitario;
                    return (
                      <div key={`${item.categoria}-${item.id}`} className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                        <span className="truncate mr-2">{item.quantidade}x {item.nome}</span>
                        <span className="font-medium flex-shrink-0">R$ {(price * item.quantidade).toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t border-gray-200 dark:border-slate-700 mt-2 pt-2 flex justify-between">
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-100">Total</span>
                  <span className="text-sm font-bold text-blue-600">R$ {cart.getTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Footer - Step 2 */}
            <SheetFooter className="border-t border-gray-200 dark:border-slate-700 pt-3 pb-4 px-4 gap-3 flex-col">
              <Button
                onClick={handleSendOrder}
                className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-base font-semibold flex items-center justify-center gap-2 rounded-xl shadow-lg shadow-green-600/20"
              >
                <MessageCircle size={20} />
                Confirmar e Enviar via WhatsApp
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
