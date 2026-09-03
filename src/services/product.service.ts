import apiClient from './api';
import { PRODUCTS_LIST } from '../utils/endpoints';

// ==========================================
// Product Service
// ==========================================

export interface Product {
  id: string;
  sku: string;
  name?: string;
  price?: number;
  unit_price?: number;
  vendor_id?: string;
  [key: string]: unknown;
}

/** Fetch products for a given vendor */
export async function getProductsByVendor(
  vendorId: string,
): Promise<Product[]> {
  if (!vendorId) return [];
  const { data } = await apiClient.get<Product[]>(PRODUCTS_LIST, {
    params: { vendor_id: vendorId },
  });
  return Array.isArray(data) ? data : (data as any)?.results || [];
}
