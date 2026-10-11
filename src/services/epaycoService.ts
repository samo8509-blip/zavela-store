import { epaycoClientConfig } from '../config/epayco.ts';

declare global {
  interface Window {
    ePayco?: {
      checkout: {
        configure: (options: { key: string; test: boolean }) => {
          open: (data: Record<string, any>) => void;
        };
      };
    };
  }
}

/**
 * Carga dinámicamente el script oficial de ePayco Colombia:
 * https://checkout.epayco.co/checkout.js
 */
export const loadEpaycoScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Window no está disponible en este entorno.'));
    }

    if (window.ePayco && window.ePayco.checkout) {
      return resolve();
    }

    const scriptId = 'epayco-checkout-script';
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (existingScript) {
      if (window.ePayco) {
        return resolve();
      }
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => reject(new Error('Error al cargar ePayco checkout script.')));
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://checkout.epayco.co/checkout.js';
    script.type = 'text/javascript';
    script.async = true;

    script.onload = () => {
      if (window.ePayco) {
        resolve();
      } else {
        // En algunos navegadores hay un retraso de microsegundos antes de que window.ePayco esté disponible
        setTimeout(() => {
          if (window.ePayco) {
            resolve();
          } else {
            resolve(); // Continuar y verificar en tiempo de ejecución
          }
        }, 100);
      }
    };

    script.onerror = () => {
      reject(new Error('No se pudo cargar la pasarela de pagos segura de ePayco. Revisa tu conexión a internet.'));
    };

    document.head.appendChild(script);
  });
};

export interface EpaycoCheckoutParams {
  orderId: string;
  orderReference: string;
  totalAmount: number;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  customerEmail?: string;
  currency?: string;
  description?: string;
}

/**
 * Configura y abre el Smart Checkout de ePayco Colombia
 */
export const triggerEpaycoCheckout = async (params: EpaycoCheckoutParams): Promise<boolean> => {
  await loadEpaycoScript();

  if (!window.ePayco || !window.ePayco.checkout) {
    throw new Error('La pasarela de ePayco no se pudo inicializar en el navegador.');
  }

  const handler = window.ePayco.checkout.configure({
    key: epaycoClientConfig.publicKey,
    test: epaycoClientConfig.testMode
  });

  // Si estamos en un host personalizado o de desarrollo, podemos usar la URL relativa o la URL configurada
  const confirmationUrl = epaycoClientConfig.confirmationUrl;
  const responseUrl = epaycoClientConfig.responseUrl;

  const data = {
    name: `Pedido ZavelaStore #${params.orderId}`,
    description: params.description || 'Compra en Zavela Store',
    invoice: String(params.orderReference),
    currency: (params.currency || 'cop').toLowerCase(),
    amount: String(Math.round(params.totalAmount)),
    tax_base: '0',
    tax: '0',
    country: 'co',
    lang: 'es',
    external: 'false',
    confirmation: confirmationUrl,
    response: responseUrl,
    name_billing: params.customerName,
    address_billing: params.customerAddress,
    mobilephone_billing: params.customerPhone,
    email_billing: params.customerEmail || `${params.customerPhone.replace(/\D/g, '')}@zavelastore.co`
  };

  console.log('[ePayco Checkout Trigger]:', data);
  handler.open(data);
  return true;
};
