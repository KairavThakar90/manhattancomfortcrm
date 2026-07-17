import apiClient from './api';
import {
  PROJECTS_LIST,
  PROJECTS_BY_ID,
  PROJECTS_CREATE,
  PROJECTS_UPDATE,
  PROJECTS_DELETE,
} from '../utils/endpoints';

// ==========================================
// Project Service
// ==========================================

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  [key: string]: unknown;
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateProjectPayload {
  name?: string;
  description?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  [key: string]: unknown;
}

/** Fetch all projects */
export async function getProjects(): Promise<Project[]> {
  const { data } = await apiClient.get<Project[]>(PROJECTS_LIST);
  return data;
}

/** Fetch a single project by ID */
export async function getProjectById(id: string): Promise<Project> {
  const { data } = await apiClient.get<Project>(PROJECTS_BY_ID(id));
  return data;
}

/** Create a new project */
export async function createProject(
  payload: CreateProjectPayload,
): Promise<Project> {
  const { data } = await apiClient.post<Project>(PROJECTS_CREATE, payload);
  return data;
}

/** Update an existing project */
export async function updateProject(
  id: string,
  payload: UpdateProjectPayload,
): Promise<Project> {
  const { data } = await apiClient.put<Project>(PROJECTS_UPDATE(id), payload);
  return data;
}

/** Partially update a project */
export async function patchProject(
  id: string,
  payload: Partial<UpdateProjectPayload>,
): Promise<Project> {
  const { data } = await apiClient.patch<Project>(
    PROJECTS_UPDATE(id),
    payload,
  );
  return data;
}

/** Delete a project by ID */
export async function deleteProject(id: string): Promise<void> {
  await apiClient.delete(PROJECTS_DELETE(id));
}
