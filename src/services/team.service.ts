import apiClient from './api';
import {
  TEAMS_LIST,
  TEAMS_BY_ID,
  TEAMS_MEMBERS,
} from '../utils/endpoints';

// ==========================================
// Team Service
// ==========================================

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  [key: string]: unknown;
}

export interface Team {
  id: string;
  name: string;
  members: TeamMember[];
  [key: string]: unknown;
}

/** Fetch all teams */
export async function getTeams(): Promise<Team[]> {
  const { data } = await apiClient.get<Team[]>(TEAMS_LIST);
  return data;
}

/** Fetch a single team by ID */
export async function getTeamById(id: string): Promise<Team> {
  const { data } = await apiClient.get<Team>(TEAMS_BY_ID(id));
  return data;
}

/** Fetch team members */
export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  const { data } = await apiClient.get<TeamMember[]>(TEAMS_MEMBERS(teamId));
  return data;
}

/** Add a member to a team */
export async function addTeamMember(
  teamId: string,
  payload: { userId: string; role?: string },
): Promise<TeamMember> {
  const { data } = await apiClient.post<TeamMember>(
    TEAMS_MEMBERS(teamId),
    payload,
  );
  return data;
}

/** Remove a member from a team */
export async function removeTeamMember(
  teamId: string,
  memberId: string,
): Promise<void> {
  await apiClient.delete(`${TEAMS_MEMBERS(teamId)}/${memberId}`);
}
