import apiClient from '../../../services/api';
import {
  USERS_LIST,
  USERS_BY_ID,
  AUTH_REGISTER,
  USERS_UPDATE,
  USERS_DELETE,
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
export async function getUsers(): Promise<User[]> {
  const { data } = await apiClient.get<User[]>(USERS_LIST);
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

/** Update an existing user */
export async function updateUser(
  id: string,
  payload: UpdateUserPayload,
): Promise<User> {
  const { data } = await apiClient.put<User>(USERS_UPDATE(id), payload);
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
