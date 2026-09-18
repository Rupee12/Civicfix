import { Schema, Types, model, type HydratedDocument, type Model } from "mongoose";
import { ISSUE_CATEGORIES, ISSUE_SEVERITIES, ISSUE_STATUSES, PRIORITY_LEVELS, SAFETY_IMPACTS, type IssueCategory, type IssueLocation, type IssueSeverity, type IssueStatus, type MediaAsset, type PriorityLevel, type SafetyImpact } from "../types/issue.js";

export interface Issue {
  title: string;
  description: string;
  category: IssueCategory;
  subcategory?: string;
  reportedBy: Types.ObjectId;
  location: IssueLocation;
  address?: string;
  area?: string;
  city?: string;
  media: { photos: MediaAsset[]; videos: MediaAsset[] };
  status: IssueStatus;
  severity: IssueSeverity;
  priorityScore: number;
  priorityLevel: PriorityLevel;
  safetyImpact: SafetyImpact;
  affectedPeopleEstimate: number;
  priorityBreakdown: { severity: number; communityReports: number; communitySupport: number; age: number; affectedPeople: number; safety: number };
  priorityUpdatedAt?: Date;
  supportCount: number;
  reportCount: number;
  reports: Types.ObjectId[];
  duplicateCandidates: Types.ObjectId[];
  canonicalLocation: IssueLocation;
  suggestedDepartmentId?: Types.ObjectId;
  departmentId?: Types.ObjectId;
  department?: string;
  assignedTo?: Types.ObjectId;
  assignedAt?: Date;
  assignmentHistory: { departmentId: Types.ObjectId; assignedTo: Types.ObjectId; assignedBy: Types.ObjectId; assignedAt: Date; reason?: string }[];
  resolution?: { description: string; photos: MediaAsset[]; completedAt?: Date };
  resolvedAt?: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type IssueDocument = HydratedDocument<Issue>;

const mediaAssetSchema = new Schema<MediaAsset>(
  { url: { type: String, required: true }, mimeType: { type: String, required: true }, originalName: { type: String, required: true }, size: { type: Number, required: true } },
  { _id: false },
);

const issueSchema = new Schema<Issue>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    category: { type: String, enum: ISSUE_CATEGORIES, required: true, index: true },
    subcategory: { type: String, trim: true, maxlength: 100 },
    reportedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    location: {
      type: { type: String, enum: ["Point"], required: true },
      coordinates: { type: [Number], required: true },
    },
    address: { type: String, trim: true, maxlength: 250 },
    area: { type: String, trim: true, maxlength: 120 },
    city: { type: String, trim: true, maxlength: 120 },
    media: { photos: { type: [mediaAssetSchema], default: [] }, videos: { type: [mediaAssetSchema], default: [] } },
    status: { type: String, enum: ISSUE_STATUSES, default: "REPORTED", index: true },
    severity: { type: String, enum: ISSUE_SEVERITIES, default: "MEDIUM", index: true },
    priorityScore: { type: Number, default: 0 },
    priorityLevel: { type: String, enum: PRIORITY_LEVELS, default: "LOW", index: true },
    safetyImpact: { type: String, enum: SAFETY_IMPACTS, default: "NONE", index: true },
    affectedPeopleEstimate: { type: Number, default: 0, min: 0, max: 100000 },
    priorityBreakdown: {
      severity: { type: Number, default: 0 }, communityReports: { type: Number, default: 0 }, communitySupport: { type: Number, default: 0 },
      age: { type: Number, default: 0 }, affectedPeople: { type: Number, default: 0 }, safety: { type: Number, default: 0 },
    },
    priorityUpdatedAt: Date,
    supportCount: { type: Number, default: 0 },
    reportCount: { type: Number, default: 1 },
    reports: { type: [Schema.Types.ObjectId], ref: "IssueReport", default: [] },
    duplicateCandidates: { type: [Schema.Types.ObjectId], ref: "Issue", default: [] },
    canonicalLocation: {
      type: { type: String, enum: ["Point"] },
      coordinates: { type: [Number] },
    },
    suggestedDepartmentId: { type: Schema.Types.ObjectId, ref: "Department", index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department", index: true },
    department: { type: String, trim: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    assignedAt: Date,
    assignmentHistory: [{ departmentId: { type: Schema.Types.ObjectId, ref: "Department" }, assignedTo: { type: Schema.Types.ObjectId, ref: "User" }, assignedBy: { type: Schema.Types.ObjectId, ref: "User" }, assignedAt: Date, reason: String }],
    resolution: { description: String, photos: { type: [mediaAssetSchema], default: [] }, completedAt: Date },
    resolvedAt: Date,
    closedAt: Date,
  },
  { timestamps: true },
);

issueSchema.index({ location: "2dsphere" });
issueSchema.index({ createdAt: -1 });

export const IssueModel: Model<Issue> = model<Issue>("Issue", issueSchema);