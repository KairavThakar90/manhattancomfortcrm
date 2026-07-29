import apiClient from './api';
import { WAREHOUSES_LIST } from '../utils/endpoints';

export async function getWarehouses(params?: any) {
  const { data } = await apiClient.get(WAREHOUSES_LIST, { params });
  return data;
}
