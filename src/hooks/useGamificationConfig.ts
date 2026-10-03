import { useState, useEffect, useCallback, useMemo } from 'react';
import { GamificationGameSettings, Product } from '../types/index.ts';
import { getActiveGamificationSettings } from '../utils/gamificationPresets.ts';
import { useProductTracker } from './useProductTracker.ts';

const GAME_SHOWN_SESSION_KEY = 'zavela_catch_game_shown';
const HAS_PURCHASED_KEY = 'zavela_has_purchased';

export interface UseGamificationConfigOptions {
  gamificationSettings?: GamificationGameSettings | null;
  catalogProducts?: Product[];
  isCheckoutOpen?: boolean;
  isOrderSuccessOpen?: boolean;
  isAdminOrAdvisor?: boolean;
}

export function useGamificationConfig({
  gamificationSettings,
  catalogProducts = [],
  isCheckoutOpen = false,
  isOrderSuccessOpen = false,
  isAdminOrAdvisor = false
}: UseGamificationConfigOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [triggerReason, setTriggerReason] = useState<'visited_threshold' | 'exit_intent' | 'inactivity' | 'floating_badge' | 'manual' | null>(null);

  // Read active configuration safely
  const config = useMemo(() => {
    return getActiveGamificationSettings(gamificationSettings);
  }, [gamificationSettings]);

  // Product Tracker
  const {
    trackedItems,
    totalVisitedCount,
    trackProductVisit,
    recordTimeSpent,
    getFavoriteProduct,
    clearTracking
  } = useProductTracker();

  // Top interest product for personalized reward card
  const favoriteProduct = useMemo(() => {
    return getFavoriteProduct(catalogProducts);
  }, [getFavoriteProduct, catalogProducts]);

  // Check if client has already purchased
  const checkHasPurchased = useCallback((): boolean => {
    try {
      return localStorage.getItem(HAS_PURCHASED_KEY) === 'true';
    } catch {
      return false;
    }
  }, []);

  const [hasPurchased, setHasPurchased] = useState<boolean>(() => checkHasPurchased());

  useEffect(() => {
    if (isOrderSuccessOpen) {
      setHasPurchased(true);
      try {
        localStorage.setItem(HAS_PURCHASED_KEY, 'true');
      } catch (e) {
        console.error(e);
      }
    }
  }, [isOrderSuccessOpen]);

  // Session shown check
  const hasBeenShownThisSession = useCallback((): boolean => {
    try {
      return sessionStorage.getItem(GAME_SHOWN_SESSION_KEY) === 'true';
    } catch {
      return false;
    }
  }, []);

  const markAsShownInSession = useCallback(() => {
    try {
      sessionStorage.setItem(GAME_SHOWN_SESSION_KEY, 'true');
    } catch (e) {
      console.warn('SessionStorage unavailable:', e);
    }
  }, []);

  // Is undecided customer: browsed products without purchasing
  const isUndecidedCustomer = Boolean(
    config.enabled &&
    !hasPurchased &&
    !isAdminOrAdvisor &&
    totalVisitedCount >= (config.minVisitedProducts || 2)
  );

  // Open Game Modal
  const openGame = useCallback((reason: 'visited_threshold' | 'exit_intent' | 'inactivity' | 'floating_badge' | 'manual' = 'manual') => {
    // If master toggle is OFF, never trigger
    if (!config.enabled) return;
    if (isAdminOrAdvisor && reason !== 'manual') return;
    if (isCheckoutOpen || isOrderSuccessOpen) return;
    if (hasPurchased && reason !== 'manual') return;

    setTriggerReason(reason);
    setIsOpen(true);
    markAsShownInSession();
  }, [config.enabled, isAdminOrAdvisor, isCheckoutOpen, isOrderSuccessOpen, hasPurchased, markAsShownInSession]);

  const closeGame = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Trigger 1: Minimum visited products threshold
  useEffect(() => {
    if (!config.enabled || !config.enableVisitedThresholdTrigger) return;
    if (hasPurchased || hasBeenShownThisSession() || isOpen || isCheckoutOpen || isOrderSuccessOpen || isAdminOrAdvisor) {
      return;
    }

    const threshold = config.minVisitedProducts || 2;
    if (totalVisitedCount >= threshold) {
      const timer = setTimeout(() => {
        if (!hasBeenShownThisSession() && !isCheckoutOpen && !hasPurchased) {
          openGame('visited_threshold');
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [
    config.enabled,
    config.enableVisitedThresholdTrigger,
    config.minVisitedProducts,
    totalVisitedCount,
    hasPurchased,
    hasBeenShownThisSession,
    isOpen,
    isCheckoutOpen,
    isOrderSuccessOpen,
    isAdminOrAdvisor,
    openGame
  ]);

  // Trigger 2: Exit Intent (mouse moves to top bar)
  useEffect(() => {
    if (!config.enabled || !config.enableExitIntent) return;
    if (hasPurchased || hasBeenShownThisSession() || isOpen || isCheckoutOpen || isOrderSuccessOpen || isAdminOrAdvisor) {
      return;
    }

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 10 && totalVisitedCount >= 1 && !hasPurchased && !hasBeenShownThisSession() && !isCheckoutOpen && !isAdminOrAdvisor) {
        openGame('exit_intent');
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [
    config.enabled,
    config.enableExitIntent,
    hasPurchased,
    totalVisitedCount,
    hasBeenShownThisSession,
    isOpen,
    isCheckoutOpen,
    isOrderSuccessOpen,
    isAdminOrAdvisor,
    openGame
  ]);

  // Trigger 3: Inactivity / prolonged browsing without buying
  useEffect(() => {
    if (!config.enabled || !config.enableInactivityTrigger) return;
    if (hasPurchased || hasBeenShownThisSession() || isOpen || isCheckoutOpen || isOrderSuccessOpen || isAdminOrAdvisor) {
      return;
    }

    const inactivityMs = (config.inactivitySeconds || 35) * 1000;
    const inactivityTimer = setTimeout(() => {
      if (totalVisitedCount >= 1 && !hasPurchased && !hasBeenShownThisSession() && !isCheckoutOpen && !isAdminOrAdvisor) {
        openGame('inactivity');
      }
    }, inactivityMs);

    return () => clearTimeout(inactivityTimer);
  }, [
    config.enabled,
    config.enableInactivityTrigger,
    config.inactivitySeconds,
    hasPurchased,
    totalVisitedCount,
    hasBeenShownThisSession,
    isOpen,
    isCheckoutOpen,
    isOrderSuccessOpen,
    isAdminOrAdvisor,
    openGame
  ]);

  return {
    isOpen,
    triggerReason,
    config,
    favoriteProduct,
    trackedItems,
    totalVisitedCount,
    isUndecidedCustomer,
    hasPurchased,
    isFloatingBadgeEnabled: config.enabled && config.enableFloatingBadge,
    openGame,
    closeGame,
    trackProductVisit,
    recordTimeSpent,
    clearTracking
  };
}
