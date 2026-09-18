import { Schema, Types, model, type Model } from "mongoose";
import type { IssueStatus } from "../types/issue.js";

export interface IssueStatusHistory {
  issueId: Types.ObjectId;
  fromStatus: IssueStatus;
  toStatus: IssueStatus;
  changedBy: Types.ObjectId;
  changedAt: Date;
  reason?: string;
}

const issueStatusHistorySchema = new Schema<IssueStatusHistory>({
  issueId: { type: Schema.Types.ObjectId, ref: "Issue", required: true, index: true },
  fromStatus: { type: String, required: true },
  toStatus: { type: String, required: true },
  changedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  changedAt: { type: Date, default: Date.now },
  reason: { type: String, trim: true, maxlength: 500 },
});

issueStatusHistorySchema.index({ issueId: 1, changedAt: -1 });

export const IssueStatusHistoryModel: Model<IssueStatusHistory> = model<IssueStatusHistory>("IssueStatusHistory", issueStatusHistorySchema);