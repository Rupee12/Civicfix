import { Schema, Types, model, type HydratedDocument, type Model } from "mongoose";
import { ISSUE_CATEGORIES, ISSUE_SEVERITIES, REPORT_STATUSES, type IssueCategory, type IssueLocation, type IssueSeverity, type MediaAsset, type ReportStatus } from "../types/issue.js";

export interface IssueReport {
  issue: Types.ObjectId;
  reportedBy: Types.ObjectId;
  title: string;
  description: string;
  category: IssueCategory;
  location: IssueLocation;
  media: { photos: MediaAsset[]; videos: MediaAsset[] };
  severity: IssueSeverity;
  reportStatus: ReportStatus;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type IssueReportDocument = HydratedDocument<IssueReport>;

const mediaAssetSchema = new Schema<MediaAsset>(
  { url: String, mimeType: String, originalName: String, size: Number },
  { _id: false },
);

const issueReportSchema = new Schema<IssueReport>(
  {
    issue: { type: Schema.Types.ObjectId, ref: "Issue", required: true, index: true },
    reportedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    category: { type: String, enum: ISSUE_CATEGORIES, required: true, index: true },
    location: { type: { type: String, enum: ["Point"], required: true }, coordinates: { type: [Number], required: true } },
    media: { photos: { type: [mediaAssetSchema], default: [] }, videos: { type: [mediaAssetSchema], default: [] } },
    severity: { type: String, enum: ISSUE_SEVERITIES, default: "MEDIUM" },
    reportStatus: { type: String, enum: REPORT_STATUSES, default: "ACTIVE", index: true },
    isPrimary: { type: Boolean, default: false },
  },
  { timestamps: true },
);

issueReportSchema.index({ location: "2dsphere" });
issueReportSchema.index({ issue: 1, createdAt: -1 });

export const IssueReportModel: Model<IssueReport> = model<IssueReport>("IssueReport", issueReportSchema);