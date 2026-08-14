import apiClient from '../../../services/api';
import {
  USERS_LIST,
  USERS_BY_ID,
  AUTH_REGISTER,
  USERS_UPDATE,
  USERS_DELETE,
  USERS_TAG,
  ACTIVITIES_LIST,
} from '../../../utils/endpoints';

// ==========================================
// User Service
// ==========================================

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  [key: string]: unknown;
}

export interface CreateUserPayload {
  first_name?: string;
  last_name?: string;
  email: string;
  password: string;
  role?: string;
  username?: string;
}

export interface UpdateUserPayload {
  username?: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
}

/** Fetch all users */
export async function getUsers(params?: {
  search?: string;
  role?: string;
}): Promise<User[]> {
  const { data } = await apiClient.get<User[]>(USERS_LIST, { params });
  return data;
}

/** Fetch a single user by ID */
export async function getUserById(id: string): Promise<User> {
  const { data } = await apiClient.get<User>(USERS_BY_ID(id));
  return data;
}

/** Create a new user (Register) */
export async function createUser(payload: CreateUserPayload): Promise<User> {
  // Default role to 'admin'
  const registerPayload = {
    ...payload,
    role: payload.role || 'admin',
  };
  const { data } = await apiClient.post<User>(AUTH_REGISTER, registerPayload);
  return data;
}

/** Update an existing user (partial patch) */
export async function updateUser(
  id: string,
  payload: UpdateUserPayload,
): Promise<User> {
  const { data } = await apiClient.patch<User>(USERS_UPDATE(id), payload);
  return data;
}

/** Partially update a user */
export async function patchUser(
  id: string,
  payload: Partial<UpdateUserPayload>,
): Promise<User> {
  const { data } = await apiClient.patch<User>(USERS_UPDATE(id), payload);
  return data;
}

/** Delete a user by ID */
export async function deleteUser(id: string): Promise<void> {
  await apiClient.delete(USERS_DELETE(id));
}

/** Fetch taggable users (names only) for @mention in comments */
export async function getTagUsers(): Promise<string[]> {
  const { data } = await apiClient.get<any[]>(USERS_TAG);
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => {
      // API may return plain strings or User objects — normalize to display name
      if (typeof item === 'string') return item;
      return (
        item.full_name ||
        `${item.first_name || ''} ${item.last_name || ''}`.trim() ||
        item.username ||
        item.email ||
        ''
      );
    })
    .filter(Boolean);
}

export async function getUserActivities(params?: {
  page?: number;
  size?: number;
  page_size?: number;
}): Promise<any> {
  const { data } = await apiClient.get(ACTIVITIES_LIST, { params });
  return data;
}
