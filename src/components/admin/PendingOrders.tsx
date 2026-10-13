import React from 'react';
import { AdminPendingDropiOrders } from './AdminPendingDropiOrders.tsx';
import { Order, Product } from '../../types/index.ts';

export interface PendingOrdersProps {
  orders: Order[];
  products: Product[];
  onRefresh: () => void;
  onEditProduct?: (product: Product) => void;
}

export const PendingOrders: React.FC<PendingOrdersProps> = (props) => {
  return <AdminPendingDropiOrders {...props} />;
};

export default PendingOrders;
