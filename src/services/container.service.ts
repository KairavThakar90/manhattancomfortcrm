import apiClient from './api';
import { 
  CONTAINERS_LIST, 
  CONTAINER_PO_ITEMS,
  CONTAINERS_CREATE,
  CONTAINERS_UPDATE,
  CONTAINERS_DELETE
} from '../utils/endpoints';

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

export async function createContainer(payload: any) {
  const { data } = await apiClient.post(CONTAINERS_CREATE, payload);
  return data;
}

export async function updateContainer(id: string | number, payload: any) {
  const { data } = await apiClient.put(CONTAINERS_UPDATE(id.toString()), payload);
  return data;
}

export async function deleteContainer(id: string | number) {
  const { data } = await apiClient.delete(CONTAINERS_DELETE(id.toString()));
  return data;
}