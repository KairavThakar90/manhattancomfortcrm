import apiClient from './api';
import { CONTAINERS_LIST } from '../utils/endpoints';

export async function getContainers(params?: {
  page?: number;
  page_size?: number;
  search?: string;
}) {
  const { data } = await apiClient.get(CONTAINERS_LIST, { params });
  return data;
}
