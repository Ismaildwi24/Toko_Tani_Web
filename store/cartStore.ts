import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;          // product_id or unique key
  product_id: string;
  name: string;
  price: number;
  unit: string;
  quantity: number;
  image: string;
  petani_name: string;
  petani_id: string;
  max_stock: number;
  selected: boolean;
}

interface CartStore {
  items: CartItem[];
  addItem: (product: Omit<CartItem, 'quantity' | 'selected'>) => void;
  removeItem: (product_id: string) => void;
  updateQuantity: (product_id: string, quantity: number) => void;
  toggleSelect: (product_id: string) => void;
  toggleSelectAll: () => void;
  clearCart: () => void;
  clearSelected: () => void;
  getSelectedItems: () => CartItem[];
  getTotal: () => number;
  getCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (product) => {
        set((state) => {
          const existingItem = state.items.find((item) => item.product_id === product.product_id);
          if (existingItem) {
            const newQuantity = Math.min(existingItem.quantity + 1, product.max_stock);
            return {
              items: state.items.map((item) =>
                item.product_id === product.product_id
                  ? { ...item, quantity: newQuantity }
                  : item
              ),
            };
          }
          return {
            items: [
              ...state.items,
              {
                ...product,
                quantity: 1,
                selected: true,
              },
            ],
          };
        });
      },

      removeItem: (product_id) => {
        set((state) => ({
          items: state.items.filter((item) => item.product_id !== product_id),
        }));
      },

      updateQuantity: (product_id, quantity) => {
        set((state) => ({
          items: state.items.map((item) => {
            if (item.product_id === product_id) {
              const newQuantity = Math.max(1, Math.min(quantity, item.max_stock));
              return { ...item, quantity: newQuantity };
            }
            return item;
          }),
        }));
      },

      toggleSelect: (product_id) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.product_id === product_id
              ? { ...item, selected: !item.selected }
              : item
          ),
        }));
      },

      toggleSelectAll: () => {
        set((state) => {
          const allSelected = state.items.length > 0 && state.items.every((item) => item.selected);
          return {
            items: state.items.map((item) => ({ ...item, selected: !allSelected })),
          };
        });
      },

      clearCart: () => {
        set({ items: [] });
      },

      clearSelected: () => {
        set((state) => ({
          items: state.items.filter((item) => !item.selected),
        }));
      },

      getSelectedItems: () => {
        return get().items.filter((item) => item.selected);
      },

      getTotal: () => {
        return get().items
          .filter((item) => item.selected)
          .reduce((total, item) => total + item.price * item.quantity, 0);
      },

      getCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },
    }),
    {
      name: 'toko-tani-cart',
    }
  )
);
