import React, { useState, useMemo } from 'react';
import { Product, CartItem } from '../types';
import { ChevronRight, Settings, ShoppingBag, Search, PlusCircle, Sparkles } from 'lucide-react';
import { sound } from '../utils/audio';

interface ProductListViewProps {
  products: Product[];
  categoryOrder?: string[];
  cartItems: CartItem[];
  currencySymbol: string;
  onSelectProduct: (product: Product) => void;
  onOpenTicket: () => void;
  onOpenSettings: () => void;
  onQuickAddProduct: () => void;
}

export const ProductListView: React.FC<ProductListViewProps> = ({
  products,
  categoryOrder,
  cartItems,
  currencySymbol,
  onSelectProduct,
  onOpenTicket,
  onOpenSettings,
  onQuickAddProduct,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');

  const categories = useMemo(() => {
    const cats = new Set<string>();
    if (categoryOrder && categoryOrder.length > 0) {
      categoryOrder.forEach((c) => {
        if (c && c.trim()) cats.add(c.trim());
      });
    }
    products.forEach((p) => {
      if (p.category && p.category.trim()) cats.add(p.category.trim());
    });
    const availableCats = Array.from(cats);
    if (categoryOrder && categoryOrder.length > 0) {
      availableCats.sort((a, b) => {
        const idxA = categoryOrder.indexOf(a);
        const idxB = categoryOrder.indexOf(b);
        const orderA = idxA === -1 ? 999 : idxA;
        const orderB = idxB === -1 ? 999 : idxB;
        return orderA - orderB;
      });
    }
    return ['Semua', ...availableCats];
  }, [products, categoryOrder]);

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
  }, [products]);

  const filteredProducts = useMemo(() => {
    return sortedProducts.filter((product) => {
      const matchSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = selectedCategory === 'Semua' || product.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [sortedProducts, searchTerm, selectedCategory]);

  const totalCartAmount = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.totalPrice, 0);
  }, [cartItems]);

  const totalItemCount = useMemo(() => {
    return cartItems.length;
  }, [cartItems]);

  const handleItemClick = (prod: Product) => {
    sound.playKeyBeep(700, 0.05);
    onSelectProduct(prod);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-slate-100 overflow-hidden select-none">
      {/* Step Header: SEMUA PRODUK + Edit button */}
      <div className="px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            SEMUA PRODUK
          </span>
          <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700/60 px-2 py-0.5 rounded-full font-mono font-semibold">
            {filteredProducts.length} item
          </span>
        </div>

        <button
          id="quick-edit-products-btn"
          onClick={onQuickAddProduct}
          className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 active:text-emerald-200 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Edit / Tambah</span>
        </button>
      </div>

      {/* Quick Search & Filter Chips */}
      <div className="p-2.5 bg-slate-900/60 border-b border-slate-800 space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="product-search-input"
            type="text"
            placeholder="Cari produk ayam, daging, ikan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950/80 text-slate-100 placeholder-slate-500 text-xs rounded-xl pl-9 pr-8 py-2 border border-slate-700/80 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition shadow-inner"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs px-1 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Pills */}
        {categories.length > 2 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  sound.playKeyBeep(450, 0.03);
                  setSelectedCategory(cat);
                }}
                className={`px-3 py-1 rounded-xl whitespace-nowrap font-semibold transition-all cursor-pointer shadow-sm active:scale-95 ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white font-bold shadow-emerald-950/60 border border-emerald-400/40'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-750 hover:text-white border border-slate-700/70'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product List matching reference image */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 p-2 scrollbar-thin scrollbar-thumb-slate-700">
        {filteredProducts.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-xs p-4 text-center">
            <p>Tiada produk dijumpai untuk &quot;{searchTerm}&quot;</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('Semua');
              }}
              className="mt-2 text-emerald-400 font-semibold underline cursor-pointer"
            >
              Set Semula Carian
            </button>
          </div>
        ) : (
          filteredProducts.map((product, idx) => (
            <button
              key={product.id}
              id={`product-item-${product.id}`}
              onClick={() => handleItemClick(product)}
              className="w-full text-left px-3 py-2.5 hover:bg-slate-800/70 active:bg-slate-750 flex items-center justify-between transition-all group cursor-pointer rounded-xl my-0.5 border border-transparent hover:border-slate-700/60 active:scale-[0.99]"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <span className="text-[11px] font-mono font-semibold text-slate-500 w-5 text-center shrink-0">
                  {idx + 1}
                </span>
                <div>
                  <div className="text-sm font-bold text-slate-100 group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
                    {product.name}
                    {product.isPopular && (
                      <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {currencySymbol}
                    {product.defaultPrice.toFixed(2)} / {product.defaultUnit}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
                  Pilih
                </span>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
              </div>
            </button>
          ))
        )}
      </div>

      {/* Bottom Bar: TETAPAN & TICKET (N) RMxx.xx matching image */}
      <div className="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center gap-2 shadow-lg">
        {/* Settings Button */}
        <button
          id="bottom-tetapan-btn"
          onClick={() => {
            sound.playKeyBeep(500, 0.04);
            onOpenSettings();
          }}
          className="flex items-center justify-center gap-1.5 px-3.5 py-3 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer min-w-[110px] shadow-sm active:scale-95"
        >
          <Settings className="w-4 h-4 text-slate-400" />
          <span>TETAPAN</span>
        </button>

        {/* Ticket Action Button (Green bar in reference image) */}
        <button
          id="bottom-ticket-btn"
          onClick={() => {
            sound.playKeyBeep(650, 0.05);
            onOpenTicket();
          }}
          className="flex-1 flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold text-sm tracking-wide shadow-lg shadow-emerald-950/60 border border-emerald-400/40 transition-all cursor-pointer active:scale-[0.98]"
        >
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" />
            <span>TICKET ({totalItemCount})</span>
          </div>
          <span className="font-mono text-base font-black">
            {currencySymbol}
            {totalCartAmount.toFixed(2)}
          </span>
        </button>
      </div>
    </div>
  );
};
