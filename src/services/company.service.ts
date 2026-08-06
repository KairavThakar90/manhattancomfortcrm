import apiClient from './api';
import { COMPANIES_LIST } from '../utils/endpoints';

export interface Company {
  id: string;
  name: string;
  sellercloud_company_id?: number | string;
}

export async function getCompanies(): Promise<Company[]> {
  const { data } = await apiClient.get(COMPANIES_LIST);
  if (Array.isArray(data)) return data;
  if (data?.results) return data.results;
  return [];
}
