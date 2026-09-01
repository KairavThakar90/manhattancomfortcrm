import apiClient from '../../../services/api';
import {
  CONTAINERS_LIST,
  CONTAINER_PO_ITEMS,
  CONTAINERS_CREATE,
  CONTAINERS_UPDATE,
  CONTAINERS_DELETE,
  CONTAINERS_ATTACHMENT_DELETE,
  CONTAINER_DETAILS,
  CONTAINER_ETA_SEARCH,
  CONTAINER_SYNC,
  CONTAINER_SYNC_SINGLE,
  CONTAINERS_EXPORT_CSV,
  CONTAINER_ACTIVITIES,
  CONTAINER_COMMENTS,
  CONTAINER_COMMENT_UPDATE,
  CONTAINER_COMMENT_DELETE,
  CONTAINER_COMMENT_ATTACHMENT_DELETE,
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

export async function searchContainerETA(containerNumber: string) {
  const { data } = await apiClient.get(
    CONTAINER_ETA_SEARCH(containerNumber.trim()),
  );
  return data;
}

export async function syncContainers(days: string = '30') {
  const url = days === 'all' ? CONTAINER_SYNC : `${CONTAINER_SYNC}?days=${days}`;
  // Pass timeout: 0 to disable the global timeout limit entirely for this sync operation
  const { data } = await apiClient.post(url, undefined, {
    timeout: 0,
  });
  return data;
}

/** Sync a single container by id (also re-syncs its linked POs) */
export async function syncSingleContainer(containerId: string) {
  const { data } = await apiClient.post(
    CONTAINER_SYNC_SINGLE(containerId),
    undefined,
    {
      timeout: 0,
    },
  );
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

export async function getContainerComments(
  containerId: string | number,
  category?: string,
) {
  const params: any = {};
  if (category) params.category = category;
  const { data } = await apiClient.get(
    CONTAINER_COMMENTS(containerId.toString()),
    { params },
  );
  return data;
}

export async function postContainerComment(
  containerId: string | number,
  payload: {
    comment: string;
    category: string;
    parent_id?: string | null;
    tagged_user_ids?: string[];
    files?: File[];
  },
) {
  const formData = new FormData();
  formData.append('comment', payload.comment || '');
  formData.append('category', payload.category);
  if (payload.parent_id) {
    formData.append('parent_id', String(payload.parent_id));
  }
  if (payload.tagged_user_ids && payload.tagged_user_ids.length > 0) {
    formData.append('tagged_user_ids', JSON.stringify(payload.tagged_user_ids));
  } else {
    formData.append('tagged_user_ids', '[]');
  }
  if (payload.files && payload.files.length > 0) {
    payload.files.forEach((f) => formData.append('files', f));
  }

  const { data } = await apiClient.post(
    CONTAINER_COMMENTS(containerId.toString()),
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 0,
    },
  );
  return data;
}

export async function updateContainerComment(
  commentId: string | number,
  payload: {
    comment: string;
    tagged_user_ids?: string[];
    files?: File[];
  },
) {
  const formData = new FormData();
  formData.append('comment', payload.comment || '');
  if (payload.tagged_user_ids && payload.tagged_user_ids.length > 0) {
    formData.append('tagged_user_ids', JSON.stringify(payload.tagged_user_ids));
  } else {
    formData.append('tagged_user_ids', '[]');
  }
  if (payload.files && payload.files.length > 0) {
    payload.files.forEach((f) => formData.append('files', f));
  }

  const { data } = await apiClient.put(
    CONTAINER_COMMENT_UPDATE(commentId.toString()),
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 0,
    },
  );
  return data;
}

export async function deleteContainerComment(commentId: string | number) {
  const { data } = await apiClient.delete(
    CONTAINER_COMMENT_DELETE(commentId.toString()),
  );
  return data;
}

export async function deleteContainerCommentAttachment(
  attachmentId: string | number,
) {
  const { data } = await apiClient.delete(
    CONTAINER_COMMENT_ATTACHMENT_DELETE(attachmentId.toString()),
  );
  return data;
}
