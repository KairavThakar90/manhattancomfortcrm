import apiClient from '../../../services/api';
import {
  CONTAINERS_LIST,
  CONTAINER_PO_ITEMS,
  CONTAINERS_CREATE,
  CONTAINERS_UPDATE,
  CONTAINERS_DELETE,
  CONTAINERS_ATTACHMENT_DELETE,
  CONTAINER_DETAILS,
  CONTAINER_SYNC,
  CONTAINERS_EXPORT_CSV,
  CONTAINER_ACTIVITIES,
} from '../../../utils/endpoints';

export async function getContainers(params?: {
  page?: number;
  page_size?: number;
  search?: string;
  date_from?: string;

  received?: boolean;
}) {
  const { data } = await apiClient.get(CONTAINERS_LIST, { params });
  return data;
}

export async function getContainerPOItems(sellercloud_po_id: string | number) {
  const { data } = await apiClient.get(
    CONTAINER_PO_ITEMS(sellercloud_po_id.toString()),
    { params: { _t: Date.now() } }, // Force fresh fetch
  );
  return data;
}

export async function createContainer(payload: any, options: any = {}) {
  const { data } = await apiClient.post(CONTAINERS_CREATE, payload, options);
  return data;
}

export async function updateContainer(
  id: string | number,
  payload: any,
  options: any = {},
) {
  const { data } = await apiClient.patch(
    CONTAINERS_UPDATE(id.toString()),
    payload,
    options,
  );
  return data;
}

export async function deleteContainer(id: string | number) {
  const { data } = await apiClient.delete(CONTAINERS_DELETE(id.toString()));
  return data;
}

export async function deleteContainerAttachment(
  attachment_id: string | number,
) {
  const { data } = await apiClient.delete(
    CONTAINERS_ATTACHMENT_DELETE(attachment_id.toString()),
  );
  return data;
}

export async function getContainerDetails(id: string | number) {
  const { data } = await apiClient.get(CONTAINER_DETAILS(id.toString()));
  return data;
}

export async function syncContainers() {
  // Pass timeout: 0 to disable the global timeout limit entirely for this sync operation
  const { data } = await apiClient.post(CONTAINER_SYNC, undefined, {
    timeout: 0,
  });
  return data;
}

export async function exportContainersCSV(payload: any) {
  const response = await apiClient.post(CONTAINERS_EXPORT_CSV, payload, {
    responseType: 'blob',
  });

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;

  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('download', `Container_Export_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();

  return response;
}

export async function getContainerActivities(
  id: string | number,
  params?: any,
) {
  const { data } = await apiClient.get(CONTAINER_ACTIVITIES(id.toString()), {
    params,
  });
  return data;
}
