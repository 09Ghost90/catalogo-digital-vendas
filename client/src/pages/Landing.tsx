import { ShoppingBag, Shield } from 'lucide-react';
import { useLocation } from 'wouter';
import Logo from '@/components/Logo';

export default function Landing() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <Logo variant="stacked" size={80} />
          <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base mt-3">
            Catálogo Digital de Produtos
          </p>
        </div>

        {/* Selection Cards */}
        <div className="space-y-4">
          {/* Client Button */}
          <button
            onClick={() => navigate('/catalogo')}
            className="w-full group relative overflow-hidden rounded-2xl border-2 border-blue-100 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 text-left transition-all duration-300 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-xl hover:shadow-blue-600/10 hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                <ShoppingBag size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-0.5">
                  Sou Cliente
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Veja nossos produtos e faça seu pedido via WhatsApp
                </p>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100/50 to-transparent dark:from-blue-900/20 rounded-bl-full -translate-y-4 translate-x-4 group-hover:scale-125 transition-transform duration-500" />
          </button>

          {/* Admin Button */}
          <button
            onClick={() => navigate('/login')}
            className="w-full group relative overflow-hidden rounded-2xl border-2 border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-left transition-all duration-300 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-xl hover:shadow-emerald-600/10 hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                <Shield size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-0.5">
                  Área Administrativa
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Gerencie produtos, preços e categorias do catálogo
                </p>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-100/50 to-transparent dark:from-emerald-900/20 rounded-bl-full -translate-y-4 translate-x-4 group-hover:scale-125 transition-transform duration-500" />
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-8">
          © 2025 Armarinhos Pereira. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
