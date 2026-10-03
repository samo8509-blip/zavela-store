import { useState, useEffect, useCallback, useMemo } from 'react';
import { Product, TrackedProduct } from '../types/index.ts';

const TRACKING_STORAGE_KEY = 'zavela_product_views';
const TRACKING_UPDATE_EVENT = 'zavela_product_tracker_update';

/**
 * Calculates a CRO affinity score based on visit frequency, engagement time, and recency.
 * Formula: (visits * 4) + (timeSpentSeconds / 6) + recencyWeight
 */
export function calculateAffinityScore(item: TrackedProduct): number {
  const now = Date.now();
  const hoursSinceLastVisit = (now - item.lastVisited) / (1000 * 60 * 60);
  const recencyBonus = Math.max(0, 10 - hoursSinceLastVisit * 2); // Higher if viewed recently
  const timeScore = Math.min(item.timeSpent, 300) / 6; // Cap time influence to avoid skewing
  const visitScore = item.visitsCount * 4;

  return Math.round((visitScore + timeScore + recencyBonus) * 10) / 10;
}

export function useProductTracker() {
  const [trackedItems, setTrackedItems] = useState<TrackedProduct[]>(() => {
    try {
      const stored = localStorage.getItem(TRACKING_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Error reading product tracker from localStorage:', e);
    }
    return [];
  });

  // Keep state in sync with localStorage and custom window events
  const syncFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(TRACKING_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setTrackedItems(parsed);
        }
      }
    } catch (e) {
      console.warn('Error syncing product tracker:', e);
    }
  }, []);

  useEffect(() => {
    const handleCustomEvent = () => syncFromStorage();
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === TRACKING_STORAGE_KEY) {
        syncFromStorage();
      }
    };

    window.addEventListener(TRACKING_UPDATE_EVENT, handleCustomEvent);
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      window.removeEventListener(TRACKING_UPDATE_EVENT, handleCustomEvent);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [syncFromStorage]);

  const saveTrackedItems = useCallback((items: TrackedProduct[]) => {
    try {
      localStorage.setItem(TRACKING_STORAGE_KEY, JSON.stringify(items));
      setTrackedItems(items);
      window.dispatchEvent(new Event(TRACKING_UPDATE_EVENT));
    } catch (e) {
      console.warn('Error saving product tracker to localStorage:', e);
    }
  }, []);

  /**
   * Track that a user opened or visited a product.
   */
  const trackProductVisit = useCallback((product: Product) => {
    if (!product || !product.id) return;

    try {
      const existing = [...trackedItems];
      const index = existing.findIndex(item => item.id === product.id);
      const now = Date.now();

      const image = product.images?.[0] || 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=600';

      if (index >= 0) {
        const current = existing[index];
        existing[index] = {
          ...current,
          name: product.title,
          price: product.price,
          image: image,
          visitsCount: current.visitsCount + 1,
          lastVisited: now,
          affinityScore: calculateAffinityScore({
            ...current,
            visitsCount: current.visitsCount + 1,
            lastVisited: now
          })
        };
      } else {
        const newItem: TrackedProduct = {
          id: product.id,
          name: product.title,
          price: product.price,
          image: image,
          visitsCount: 1,
          timeSpent: 5, // initial visit weight
          lastVisited: now,
          affinityScore: 10
        };
        existing.push(newItem);
      }

      saveTrackedItems(existing);
    } catch (err) {
      console.error('Error tracking product visit:', err);
    }
  }, [trackedItems, saveTrackedItems]);

  /**
   * Add active browsing time (in seconds) spent on a product page/modal.
   */
  const recordTimeSpent = useCallback((productId: string, seconds: number) => {
    if (!productId || seconds <= 0) return;

    try {
      const existing = [...trackedItems];
      const index = existing.findIndex(item => item.id === productId);

      if (index >= 0) {
        const current = existing[index];
        const updatedTime = current.timeSpent + seconds;
        existing[index] = {
          ...current,
          timeSpent: updatedTime,
          affinityScore: calculateAffinityScore({
            ...current,
            timeSpent: updatedTime
          })
        };
        saveTrackedItems(existing);
      }
    } catch (err) {
      console.error('Error recording product time spent:', err);
    }
  }, [trackedItems, saveTrackedItems]);

  /**
   * Calculate and return the user's top-interest favorite product.
   * If matched with catalog products, returns the full Product object; otherwise returns the TrackedProduct.
   */
  const getFavoriteTrackedProduct = useCallback((): TrackedProduct | null => {
    if (trackedItems.length === 0) return null;

    const scored = trackedItems.map(item => ({
      ...item,
      score: calculateAffinityScore(item)
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored[0] || null;
  }, [trackedItems]);

  /**
   * Returns matching Product object from store catalogue if available
   */
  const getFavoriteProduct = useCallback((catalogProducts: Product[] = []): Product | null => {
    const topTracked = getFavoriteTrackedProduct();
    if (!topTracked) {
      // Fallback to first available active featured product if nothing tracked yet
      return catalogProducts.find(p => (p.active ?? true)) || catalogProducts[0] || null;
    }

    const foundInCatalog = catalogProducts.find(p => p.id === topTracked.id);
    if (foundInCatalog) return foundInCatalog;

    // Fallback: construct lightweight product object from tracked data
    return {
      id: topTracked.id,
      title: topTracked.name,
      slug: topTracked.id,
      price: topTracked.price,
      images: [topTracked.image],
      description: 'Producto favorito seleccionado según tu interés de navegación.',
      categoryId: 'all',
      stock: 10,
      tags: ['favorito', 'ruleta'],
      active: true
    };
  }, [getFavoriteTrackedProduct]);

  const clearTracking = useCallback(() => {
    try {
      localStorage.removeItem(TRACKING_STORAGE_KEY);
      setTrackedItems([]);
      window.dispatchEvent(new Event(TRACKING_UPDATE_EVENT));
    } catch (e) {
      console.warn('Error clearing tracking:', e);
    }
  }, []);

  const totalVisitedCount = useMemo(() => {
    return trackedItems.length;
  }, [trackedItems]);

  return {
    trackedItems,
    totalVisitedCount,
    trackProductVisit,
    recordTimeSpent,
    getFavoriteTrackedProduct,
    getFavoriteProduct,
    clearTracking
  };
}
