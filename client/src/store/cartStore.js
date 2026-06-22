import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      userId: null,
      
      setUserId: (id) => set({ userId: id }),

      fetchCart: async (id) => {
        try {
          const res = await axios.get(`/api/users/${id}/cart`);
          set({ items: res.data, userId: id });
        } catch (err) {
          console.error("Fetch Cart Error:", err);
        }
      },

      syncWithBackend: async () => {
        const { userId, items } = get();
        if (!userId) return;
        try {
          const res = await axios.post(`/api/users/${userId}/cart`, { items });
          if (res.data.items) {
            set({ items: res.data.items });
          }
        } catch (err) {
          console.error("Sync Cart Error:", err);
        }
      },
      
      toggleCart: () => set({ isOpen: !get().isOpen }),
      
      addItem: async (product) => {
        const currentItems = get().items;
        const existingItem = currentItems.find(item => item._id === product._id);
        
        if (existingItem) {
          set({
            items: currentItems.map(item => 
              item._id === product._id 
                ? { ...item, quantity: item.quantity + 1 } 
                : item
            )
          });
        } else {
          set({ items: [...currentItems, { ...product, quantity: 1 }] });
        }
        set({ isOpen: true });
        await get().syncWithBackend();
      },
      
      removeItem: async (productId) => {
        set({
          items: get().items.filter(item => item._id !== productId)
        });
        await get().syncWithBackend();
      },
      
      setQuantity: async (productId, quantity) => {
        const currentItems = get().items;
        set({
          items: currentItems.map(item => 
            item._id === productId 
              ? { ...item, quantity: Math.max(0, quantity) }
              : item
          )
        });
        await get().syncWithBackend();
      },
      
      updateItemMeta: async (productId, updates) => {
        const currentItems = get().items;
        set({
          items: currentItems.map(item => 
            item._id === productId ? { ...item, ...updates } : item
          )
        });
        await get().syncWithBackend();
      },

      updateQuantity: async (productId, delta) => {
        const currentItems = get().items;
        set({
          items: currentItems.map(item => {
            if (item._id === productId) {
              const newQty = Math.max(1, item.quantity + delta);
              return { ...item, quantity: newQty };
            }
            return item;
          })
        });
        await get().syncWithBackend();
      },
      
      clearCart: async () => {
        set({ items: [] });
        await get().syncWithBackend();
      },
      
      total: () => {
        return get().items.reduce((acc, item) => {
          const price = item.discount > 0 
            ? item.price - (item.price * (item.discount / 100))
            : item.price;
          return acc + (price * item.quantity);
        }, 0);
      }
    }),
    {
      name: 'hooligan-cart',
      onRehydrateStorage: () => (state) => {
      }
    }
  )
);

export default useCartStore;
