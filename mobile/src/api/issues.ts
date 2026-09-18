import type { DuplicateCandidate, Issue, IssueCategory, IssueSeverity, VerificationSummary } from '../types/issue';
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

export async function getIssue(id: string) {
  const response = await apiClient.get<{ data: { issue: Issue } }>(`/issues/${id}`);
  return response.data.data.issue;
}

export async function login(email: string, password: string) {
  const response = await apiClient.post<{ data: { token: string; user: { role: string } } }>('/auth/login', { email, password });
  return response.data.data;
}

export async function register(name: string, email: string, password: string) {
  const response = await apiClient.post('/auth/register', { name, email, password });
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

export async function getVerification(id: string) {
  const response = await apiClient.get<{ data: VerificationSummary }>(`/issues/${id}/verification`);
  return response.data.data;
}

export async function submitVerification(id: string, vote: 'RESOLVED' | 'NOT_RESOLVED', comment?: string) {
  const response = await apiClient.post<{ data: VerificationSummary }>(`/issues/${id}/verification`, { vote, ...(comment?.trim() ? { comment: comment.trim() } : {}) });
  return response.data.data;
}
