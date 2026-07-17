import apiClient from './api';
import {
  TASKS_LIST,
  TASKS_BY_ID,
  TASKS_CREATE,
  TASKS_UPDATE,
  TASKS_DELETE,
  TASKS_ASSIGN,
} from '../utils/endpoints';

// ==========================================
// Task Service
// ==========================================

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  assigneeId?: string;
  boardId?: string;
  priority?: string;
  dueDate?: string;
  [key: string]: unknown;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  status?: string;
  assigneeId?: string;
  boardId?: string;
  priority?: string;
  dueDate?: string;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  status?: string;
  assigneeId?: string;
  priority?: string;
  dueDate?: string;
  [key: string]: unknown;
}

export interface AssignTaskPayload {
  assigneeId: string;
}

/** Fetch all tasks */
export async function getTasks(): Promise<Task[]> {
  const { data } = await apiClient.get<Task[]>(TASKS_LIST);
  return data;
}

/** Fetch a single task by ID */
export async function getTaskById(id: string): Promise<Task> {
  const { data } = await apiClient.get<Task>(TASKS_BY_ID(id));
  return data;
}

/** Create a new task */
export async function createTask(payload: CreateTaskPayload): Promise<Task> {
  const { data } = await apiClient.post<Task>(TASKS_CREATE, payload);
  return data;
}

/** Update an existing task (full) */
export async function updateTask(
  id: string,
  payload: UpdateTaskPayload,
): Promise<Task> {
  const { data } = await apiClient.put<Task>(TASKS_UPDATE(id), payload);
  return data;
}

/** Partially update a task */
export async function patchTask(
  id: string,
  payload: Partial<UpdateTaskPayload>,
): Promise<Task> {
  const { data } = await apiClient.patch<Task>(TASKS_UPDATE(id), payload);
  return data;
}

/** Delete a task by ID */
export async function deleteTask(id: string): Promise<void> {
  await apiClient.delete(TASKS_DELETE(id));
}

/** Assign a task to a user */
export async function assignTask(
  id: string,
  payload: AssignTaskPayload,
): Promise<Task> {
  const { data } = await apiClient.post<Task>(TASKS_ASSIGN(id), payload);
  return data;
}
