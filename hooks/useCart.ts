import { useEffect, useState } from 'react';
import { useCartStore, CartItem } from '@/store/cartStore';

export function useCart() {
  const [mounted, setMounted] = useState(false);
  const cart = useCartStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  return {
    items: mounted ? cart.items : ([] as CartItem[]),
    addItem: cart.addItem,
    removeItem: cart.removeItem,
    updateQuantity: cart.updateQuantity,
    toggleSelect: cart.toggleSelect,
    toggleSelectAll: cart.toggleSelectAll,
    clearCart: cart.clearCart,
    clearSelected: cart.clearSelected,
    getSelectedItems: cart.getSelectedItems,
    getTotal: () => (mounted ? cart.getTotal() : 0),
    getCount: () => (mounted ? cart.getCount() : 0),
    isLoaded: mounted,
  };
}
