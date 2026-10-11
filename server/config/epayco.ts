import dotenv from 'dotenv';
dotenv.config();

/**
 * ePayco Colombia - Server Configuration
 * ZavelaStore Production & Test Gateway Parameters
 * Supports standard .env template keys and legacy aliases with safe fallbacks
 */
export const epaycoConfig = {
  pCustIdCliente: process.env.EPAYCO_CUSTOMER_ID || process.env.EPAYCO_P_CUST_ID_CLIENTE || '1595238',
  publicKey: process.env.EPAYCO_PUBLIC_KEY || '2b23e90f24303c0fa37a41ed59e09ce5',
  privateKey: process.env.EPAYCO_PRIVATE_KEY || '5c23c687c38354c0330a0c37a0308c4d',
  pKey: process.env.EPAYCO_P_KEY || '5f6cceabcfa38f45e37c5b9295349c2209fc1306',
  testMode: process.env.EPAYCO_TEST_MODE !== undefined ? process.env.EPAYCO_TEST_MODE !== 'false' : true,
  responseUrl: process.env.URL_RESPONSE || process.env.EPAYCO_RESPONSE_URL || 'https://zavelastore.com.co/order-confirmation',
  confirmationUrl: process.env.URL_CONFIRMATION || process.env.EPAYCO_CONFIRMATION_URL || 'https://zavelastore.com.co/api/payments/epayco-webhook'
};
