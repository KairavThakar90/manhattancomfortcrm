import apiClient from './api';
import {
  BOARDS_LIST,
  BOARDS_BY_ID,
  BOARDS_UPDATE,
} from '../utils/endpoints';

// ==========================================
// Board / Kanban Service
// ==========================================

export interface Board {
  id: string;
  name: string;
  columns: unknown[];
  [key: string]: unknown;
}

export interface UpdateBoardPayload {
  name?: string;
  columns?: unknown[];
  [key: string]: unknown;
}

/** Fetch all boards */
export async function getBoards(): Promise<Board[]> {
  const { data } = await apiClient.get<Board[]>(BOARDS_LIST);
  return data;
}

/** Fetch a single board by ID */
export async function getBoardById(id: string): Promise<Board> {
  const { data } = await apiClient.get<Board>(BOARDS_BY_ID(id));
  return data;
}

/** Update a board */
export async function updateBoard(
  id: string,
  payload: UpdateBoardPayload,
): Promise<Board> {
  const { data } = await apiClient.put<Board>(BOARDS_UPDATE(id), payload);
  return data;
}

/** Partially update a board */
export async function patchBoard(
  id: string,
  payload: Partial<UpdateBoardPayload>,
): Promise<Board> {
  const { data } = await apiClient.patch<Board>(BOARDS_UPDATE(id), payload);
  return data;
}
