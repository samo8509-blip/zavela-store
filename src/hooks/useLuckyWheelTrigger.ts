import { useState, useEffect, useCallback, useMemo } from 'react';
import { LuckyWheelSettings } from '../types/index.ts';
import { getActiveLuckyWheelSettings } from '../utils/luckyWheelPresets.ts';

const LUCKY_WHEEL_SHOWN_SESSION_KEY = 'zavela_lucky_wheel_shown';
const HAS_PURCHASED_KEY = 'zavela_has_purchased';

interface UseLuckyWheelTriggerOptions {
  totalVisitedCount: number;
  hasItemsInCart: boolean;
  isCheckoutOpen: boolean;
  isOrderSuccessOpen: boolean;
  isAdminOrAdvisor: boolean;
  luckyWheelSettings?: LuckyWheelSettings | null;
}

export function useLuckyWheelTrigger({
  totalVisitedCount,
  hasItemsInCart,
  isCheckoutOpen,
  isOrderSuccessOpen,
  isAdminOrAdvisor,
  luckyWheelSettings
}: UseLuckyWheelTriggerOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [triggerReason, setTriggerReason] = useState<'visited_3_products' | 'exit_intent' | 'inactivity' | 'social_closing' | 'manual' | null>(null);

  const config = useMemo(() => {
    return getActiveLuckyWheelSettings(luckyWheelSettings);
  }, [luckyWheelSettings]);

  // Check if client has already made a purchase on this store
  const checkHasPurchased = useCallback((): boolean => {
    try {
      return localStorage.getItem(HAS_PURCHASED_KEY) === 'true';
    } catch {
      return false;
    }
  }, []);

  const [hasPurchased, setHasPurchased] = useState<boolean>(() => checkHasPurchased());

  // Listen to purchase events or updates
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

  // Undecided customer status: only true when client has browsed products without purchasing anything
  const isUndecidedCustomer = Boolean(
    config.enabled &&
    !hasPurchased && 
    !isAdminOrAdvisor && 
    (totalVisitedCount >= (config.minVisitedProducts || 2))
  );

  // Check if already shown in this browser session
  const hasBeenShownThisSession = useCallback((): boolean => {
    try {
      return sessionStorage.getItem(LUCKY_WHEEL_SHOWN_SESSION_KEY) === 'true';
    } catch {
      return false;
    }
  }, []);

  const markAsShownInSession = useCallback(() => {
    try {
      sessionStorage.setItem(LUCKY_WHEEL_SHOWN_SESSION_KEY, 'true');
    } catch (e) {
      console.warn('SessionStorage unavailable:', e);
    }
  }, []);

  const openLuckyWheel = useCallback((reason: 'visited_3_products' | 'exit_intent' | 'inactivity' | 'social_closing' | 'manual' = 'manual') => {
    // If globally disabled, NEVER open the wheel
    if (!config.enabled) return;

    // If user already bought and it's not an explicit social closing trigger, do not show
    if (isAdminOrAdvisor || isCheckoutOpen || isOrderSuccessOpen) return;
    if (hasPurchased && reason !== 'social_closing') return;
    
    setTriggerReason(reason);
    setIsOpen(true);
    markAsShownInSession();
  }, [config.enabled, isAdminOrAdvisor, isCheckoutOpen, isOrderSuccessOpen, hasPurchased, markAsShownInSession]);

  const closeLuckyWheel = useCallback(() => {
    setIsOpen(false);
  }, []);

  // 1. TRIGGER CONDITION A: Visited threshold products without purchase (Undecided client)
  useEffect(() => {
    if (!config.enabled || !config.enableVisitedThresholdTrigger) return;

    const threshold = config.minVisitedProducts || 2;
    if (
      totalVisitedCount >= threshold && 
      !hasPurchased &&
      !hasBeenShownThisSession() && 
      !isOpen && 
      !isCheckoutOpen && 
      !isOrderSuccessOpen && 
      !isAdminOrAdvisor
    ) {
      const timer = setTimeout(() => {
        if (!hasBeenShownThisSession() && !isCheckoutOpen && !hasPurchased) {
          openLuckyWheel('visited_3_products');
        }
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [config.enabled, config.enableVisitedThresholdTrigger, config.minVisitedProducts, totalVisitedCount, hasPurchased, hasBeenShownThisSession, isOpen, isCheckoutOpen, isOrderSuccessOpen, isAdminOrAdvisor, openLuckyWheel]);

  // 2. TRIGGER CONDITION B: Exit Intent (mouse moves to top bar on desktop for undecided client)
  useEffect(() => {
    if (!config.enabled || !config.enableExitIntent) return;
    if (hasPurchased || hasBeenShownThisSession() || isCheckoutOpen || isOrderSuccessOpen || isAdminOrAdvisor) {
      return;
    }

    const handleMouseLeave = (e: MouseEvent) => {
      // If cursor moves out of top viewport boundary and user has viewed at least 1 product without buying
      if (e.clientY <= 10 && totalVisitedCount >= 1 && !hasPurchased && !hasBeenShownThisSession() && !isCheckoutOpen && !isAdminOrAdvisor) {
        openLuckyWheel('exit_intent');
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [config.enabled, config.enableExitIntent, hasPurchased, totalVisitedCount, hasBeenShownThisSession, isCheckoutOpen, isOrderSuccessOpen, isAdminOrAdvisor, openLuckyWheel]);

  // 3. TRIGGER CONDITION C: Inactivity / prolonged browsing without buying
  useEffect(() => {
    if (!config.enabled || !config.enableInactivityTrigger) return;
    if (hasPurchased || hasBeenShownThisSession() || isCheckoutOpen || isOrderSuccessOpen || isAdminOrAdvisor) {
      return;
    }

    const inactivityMs = (config.inactivitySeconds || 40) * 1000;
    const inactivityTimer = setTimeout(() => {
      if (totalVisitedCount >= 1 && !hasPurchased && !hasBeenShownThisSession() && !isCheckoutOpen && !isAdminOrAdvisor) {
        openLuckyWheel('inactivity');
      }
    }, inactivityMs);

    return () => clearTimeout(inactivityTimer);
  }, [config.enabled, config.enableInactivityTrigger, config.inactivitySeconds, hasPurchased, totalVisitedCount, hasBeenShownThisSession, isCheckoutOpen, isOrderSuccessOpen, isAdminOrAdvisor, openLuckyWheel]);

  return {
    isOpen,
    triggerReason,
    isUndecidedCustomer,
    hasPurchased,
    openLuckyWheel,
    closeLuckyWheel,
    hasBeenShownThisSession: hasBeenShownThisSession(),
    isFloatingBadgeEnabled: config.enabled && config.enableFloatingBadge
  };
}
