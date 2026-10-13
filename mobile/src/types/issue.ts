export const ISSUE_CATEGORIES = [
  'GARBAGE',
  'ILLEGAL_DUMPING',
  'BROKEN_STREETLIGHT',
  'OPEN_DRAIN',
  'DAMAGED_ROAD',
  'WATER_LEAKAGE',
  'PUBLIC_SPACE_DAMAGE',
  'OTHER',
] as const;

export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];
export type IssueSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IssueStatus = 'REPORTED' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'VERIFICATION_PENDING' | 'CLOSED';
export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type SafetyImpact = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: IssueCategory;
  location: { latitude: number; longitude: number };
  media: { photos: { url: string }[]; videos: { url: string }[] };
  status: IssueStatus;
  severity: IssueSeverity;
  supportCount: number;
  reportCount: number;
  priorityScore: number;
  priorityLevel: PriorityLevel;
  safetyImpact: SafetyImpact;
  affectedPeopleEstimate: number;
  priorityBreakdown: { severity: number; communityReports: number; communitySupport: number; age: number; affectedPeople: number; safety: number };
  departmentId?: string;
  assignedTo?: string;
  assignedAt?: string;
  resolvedAt?: string;
  slaDueAt?: string;
  resolution?: Resolution;
  createdAt: string;
  distanceMeters?: number;
}

export interface DuplicateCandidate {
  issueId: string;
  title: string;
  category: IssueCategory;
  distanceMeters: number;
  duplicateScore: number;
  confidence: 'HIGH' | 'POSSIBLE';
  supportCount: number;
  reportCount: number;
  media: { photos: { url: string }[]; videos: { url: string }[] };
}

export interface Resolution {
  id: string;
  description: string;
  resolvedBy?: { name: string; role: string };
  beforeMedia: { photos: { url: string }[]; videos: { url: string }[] };
  afterMedia: { photos: { url: string }[]; videos: { url: string }[] };
  completedAt: string;
}