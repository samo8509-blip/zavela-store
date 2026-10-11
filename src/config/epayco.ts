/**
 * ePayco Colombia - Client Configuration
 * Safe frontend parameters for ePayco Smart Checkout popup
 * Reads environment variables with safe defaults so the UI never breaks.
 */
export const epaycoClientConfig = {
  pCustIdCliente: 
    (import.meta as any).env?.VITE_EPAYCO_CUSTOMER_ID ||
    (import.meta as any).env?.VITE_EPAYCO_P_CUST_ID_CLIENTE ||
    '1595238',
  publicKey: 
    (import.meta as any).env?.VITE_EPAYCO_PUBLIC_KEY || 
    '2b23e90f24303c0fa37a41ed59e09ce5',
  testMode: 
    (import.meta as any).env?.VITE_EPAYCO_TEST_MODE !== undefined 
      ? (import.meta as any).env?.VITE_EPAYCO_TEST_MODE !== 'false' 
      : true,
  responseUrl: 
    (import.meta as any).env?.VITE_URL_RESPONSE ||
    (import.meta as any).env?.VITE_EPAYCO_RESPONSE_URL || 
    'https://zavelastore.com.co/order-confirmation',
  confirmationUrl: 
    (import.meta as any).env?.VITE_URL_CONFIRMATION ||
    (import.meta as any).env?.VITE_EPAYCO_CONFIRMATION_URL || 
    'https://zavelastore.com.co/api/payments/epayco-webhook'
};
