import React from 'react';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  ArrowRight, 
  ShieldCheck,
  Gift,
  Truck,
  Sparkles
} from 'lucide-react';
import { CartItem } from '../types/index.ts';
import { formatCOP } from '../utils/formatters.ts';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, variantId: string | undefined, delta: number) => void;
  onRemoveItem: (productId: string, variantId: string | undefined) => void;
  onProceedToCheckout: () => void;
  freeShippingThreshold?: number;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  freeShippingThreshold = 120000
}) => {
  if (!isOpen) return null;

  const subtotal = cartItems.reduce((sum, item) => {
    const price = item.variant ? item.variant.price : item.product.price;
    return sum + price * item.quantity;
  }, 0);

  const totalItemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // Modalidad A: Envío Gratis Nacional ($0 COP) en todos los pedidos
  const shippingCost = 0;
  const total = subtotal;

  return (
    <div 
      id="cart-drawer-backdrop" 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end"
      onClick={onClose}
    >
      <div 
        id="cart-drawer-panel" 
        className="w-full max-w-lg sm:max-w-xl bg-white text-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 bg-sky-600 rounded-full shadow-xs" />
            <h2 className="font-black text-sm uppercase tracking-widest text-slate-900">
              Carrito Zavela ({totalItemCount} {totalItemCount === 1 ? 'producto' : 'productos'})
            </h2>
          </div>
          <button
            id="btn-close-cart"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer border border-slate-200 shadow-2xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modalidad A Informative Benefit Badge: 🚚 Envío Gratis Incluido a Toda Colombia */}
        <div className="px-4 py-3 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-sky-500/15 border-b border-emerald-200/80">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Truck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-emerald-900 flex items-center gap-1.5 truncate">
                  <span>🚚 Envío Gratis Incluido a Toda Colombia</span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                </div>
                <p className="text-[11px] text-emerald-700/90 font-medium truncate">
                  Despacho nacional sin costo adicional con Pago Contra Entrega
                </p>
              </div>
            </div>
            <span className="bg-emerald-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-2xs shrink-0">
              $0 Flete
            </span>
          </div>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mb-4 text-sky-600 shadow-sm">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-1.5">Tu carrito está vacío</h3>
              <p className="text-xs text-slate-600 max-w-xs mb-5">
                Explora el catálogo Zavela. Todos tus pedidos incluyen <strong>Envío Gratis Nacional ($0 COP)</strong> y Pago Contra Entrega en efectivo.
              </p>
              <button
                onClick={onClose}
                className="bg-gradient-to-r from-[#FF5A36] to-[#FF3366] hover:from-[#E04826] hover:to-[#E02656] text-white text-xs font-black px-5 py-2.5 rounded-xl transition-all uppercase tracking-wider cursor-pointer shadow-md hover:shadow-lg"
              >
                Explorar Productos
              </button>
            </div>
          ) : (
            cartItems.map((item, idx) => {
              const price = item.variant ? item.variant.price : item.product.price;
              const image = item.product.images[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80';

              return (
                <div 
                  key={`${item.product.id}-${item.variant?.id || 'none'}-${idx}`}
                  id={`cart-item-${item.product.id}`}
                  className="flex gap-4 p-3.5 sm:p-4 rounded-2xl border border-slate-200 bg-white relative shadow-xs hover:border-sky-300 transition-colors"
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200 p-1 flex items-center justify-center">
                    <img 
                      src={image} 
                      alt={item.product.title} 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover rounded-lg" 
                    />
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 line-clamp-1">
                        {item.product.title}
                      </h4>
                      {item.variant && (
                        <span className="text-[10px] text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded-md inline-block mt-1 border border-sky-200">
                          {item.variant.name}
                        </span>
                      )}
                      {item.comboInfo && (
                        <span className="text-[10px] text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded-md inline-block mt-1 ml-1 border border-red-200">
                          🛍️ {item.comboInfo}
                        </span>
                      )}
                      <div className="font-mono font-black text-sm text-slate-900 mt-1">
                        {formatCOP(price)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      {/* Quantity Stepper */}
                      <div className="flex items-center border border-slate-300 rounded-xl bg-slate-50">
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, item.variant?.id, -1)}
                          className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors rounded-l-xl cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center font-mono font-bold text-xs text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, item.variant?.id, 1)}
                          className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors rounded-r-xl cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => onRemoveItem(item.product.id, item.variant?.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1.5 cursor-pointer rounded-lg hover:bg-rose-50"
                        title="Eliminar producto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Summary & Checkout */}
        {cartItems.length > 0 && (
          <div className="p-5 sm:p-6 border-t border-slate-200 bg-white space-y-3.5 shadow-md">
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal ({totalItemCount} {totalItemCount === 1 ? 'unidad' : 'unidades'}):</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{formatCOP(subtotal)}</span>
              </div>
              
              <div className="flex justify-between items-center text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Envío a domicilio:</span>
                </span>
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-black uppercase tracking-wider text-xs flex items-center gap-1 shadow-2xs">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  ¡GRATIS! ($0 COP)
                </span>
              </div>

              <div className="flex justify-between text-base font-bold text-slate-900 pt-2.5 border-t border-slate-200">
                <span className="uppercase tracking-wider text-xs text-slate-600">Total a Pagar:</span>
                <span className="text-lg font-mono text-slate-900 font-black">
                  {formatCOP(total)}
                </span>
              </div>
            </div>

            {/* Primary CTA button: Coral / Rojo Anaranjado Vibrante (Alto CTR) */}
            <button
              id="btn-drawer-checkout"
              onClick={onProceedToCheckout}
              className="w-full h-12 bg-gradient-to-r from-[#FF5A36] to-[#FF3366] hover:from-[#E04826] hover:to-[#E02656] active:scale-98 text-white font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 uppercase tracking-wider transition-all cursor-pointer shadow-md hover:shadow-lg"
            >
              <span>CONTINUAR AL CHECKOUT (PAGO CONTRA ENTREGA)</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>

            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Despacho garantizado por Coordinadora, Servientrega e Interrapidísimo</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
