import apiClient from './api';
import { CONTAINERS_LIST, CONTAINER_PO_ITEMS } from '../utils/endpoints';

export async function getContainers(params?: {
  page?: number;
  page_size?: number;
  search?: string;
}) {
  const { data } = await apiClient.get(CONTAINERS_LIST, { params });
  return data;
}

export async function getContainerPOItems(sellercloud_po_id: string | number) {
  const { data } = await apiClient.get(CONTAINER_PO_ITEMS(sellercloud_po_id.toString()));
  return data;
}