import type { DuplicateCandidate, Issue, IssueCategory, IssueSeverity } from '../types/issue';
import { apiClient } from './client';

export interface CreateIssueInput {
  title: string;
  description: string;
  category: IssueCategory;
  severity: IssueSeverity;
  latitude: number;
  longitude: number;
  photos: { uri: string; name: string; type: string }[];
  safetyImpact: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  affectedPeopleEstimate: number;
}

export async function createIssue(input: CreateIssueInput) {
  const formData = new FormData();
  formData.append('title', input.title);
  formData.append('description', input.description);
  formData.append('category', input.category);
  formData.append('severity', input.severity);
  formData.append('latitude', String(input.latitude));
  formData.append('longitude', String(input.longitude));
  formData.append('safetyImpact', input.safetyImpact);
  formData.append('affectedPeopleEstimate', String(input.affectedPeopleEstimate));
  input.photos.forEach((photo) => formData.append('photos', photo as unknown as Blob));
  const response = await apiClient.post<{ data: { issue: Issue } }>('/issues', formData);
  return response.data.data.issue;
}

export async function getNearbyIssues(latitude: number, longitude: number) {
  const response = await apiClient.get<{ data: { issues: Issue[] } }>('/issues/nearby', { params: { latitude, longitude, radius: 1000 } });
  return response.data.data.issues;
}

export async function getMyIssues() {
  const response = await apiClient.get<{ data: { issues: Issue[]; pagination: { page: number; limit: number; total: number; totalPages: number } } }>('/issues/my', { params: { page: 1, limit: 50, sort: 'newest' } });
  return response.data.data.issues;
}

export async function getIssue(id: string) {
  const response = await apiClient.get<{ data: { issue: Issue } }>(`/issues/${id}`);
  return response.data.data.issue;
}

export async function getStatusHistory(id: string) {
  const response = await apiClient.get<{ data: { history: { id: string; fromStatus: string; toStatus: string; changedBy?: { name: string; role: string }; changedAt: string; reason?: string }[] } }>(`/issues/${id}/status-history`);
  return response.data.data.history;
}

export async function getVerificationSummary(id: string) {
  const response = await apiClient.get<{ data: { resolved: number; notResolved: number; thresholds: { positiveVotesToClose: number; negativeVotesToReopen: number }; yourVerification: { vote: 'RESOLVED' | 'NOT_RESOLVED'; comment?: string } | null; status: string; eligible: boolean } }>(`/issues/${id}/verification`);
  return response.data.data;
}

export async function submitVerification(id: string, vote: 'RESOLVED' | 'NOT_RESOLVED', comment?: string) {
  const response = await apiClient.post<{ data: { resolved: number; notResolved: number; thresholds: { positiveVotesToClose: number; negativeVotesToReopen: number }; yourVerification: { vote: 'RESOLVED' | 'NOT_RESOLVED'; comment?: string } | null; status: string; eligible: boolean } }>(`/issues/${id}/verification`, { vote, comment });
  return response.data.data;
}

export async function login(email: string, password: string) {
  const response = await apiClient.post<{ data: { token: string; user: { role: string } } }>('/auth/login', { email, password });
  return response.data.data;
}

export async function checkDuplicates(input: Omit<CreateIssueInput, 'photos'>) {
  const response = await apiClient.post<{ data: { candidates: DuplicateCandidate[] } }>('/issues/check-duplicates', input);
  return response.data.data.candidates;
}

export async function supportIssue(id: string, input?: Omit<CreateIssueInput, 'photos'>) {
  const response = await apiClient.post<{ data: { issue: Issue } }>(`/issues/${id}/support`, input);
  return response.data.data.issue;
}

export async function getIssuePriority(id: string) {
  const response = await apiClient.get<{ data: { score: number; level: Issue['priorityLevel']; breakdown: Issue['priorityBreakdown']; explanation: string[] } }>(`/issues/${id}/priority`);
  return response.data.data;
}

export async function getIssueSla(id: string) {
  const response = await apiClient.get<{ data: { sla: { dueAt: string; breachedAt?: string; escalationLevel: number } | null; status: string } }>(`/sla/issues/${id}`);
  return response.data.data;
}

export async function getAuthorityIssues() {
  const response = await apiClient.get<{ data: { issues: Issue[] } }>('/authority/issues');
  return response.data.data.issues;
}

export async function updateIssueStatus(id: string, status: 'IN_PROGRESS') {
  const response = await apiClient.patch<{ data: { issue: Issue } }>(`/issues/${id}/status`, { status });
  return response.data.data.issue;
}

export async function submitResolution(id: string, description: string, photos: { uri: string; name: string; type: string }[]) {
  const formData = new FormData();
  formData.append('description', description);
  photos.forEach((photo) => formData.append('afterPhotos', photo as unknown as Blob));
  const response = await apiClient.post<{ data: { issue: Issue; resolution: Issue['resolution'] } }>(`/issues/${id}/resolution`, formData);
  return response.data.data;
}