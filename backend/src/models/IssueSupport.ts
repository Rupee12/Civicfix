import { Schema, Types, model, type Model } from "mongoose";

export interface IssueSupport {
  issue: Types.ObjectId;
  user: Types.ObjectId;
  createdAt: Date;
}

const issueSupportSchema = new Schema<IssueSupport>({
  issue: { type: Schema.Types.ObjectId, ref: "Issue", required: true },
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
});

issueSupportSchema.index({ issue: 1, user: 1 }, { unique: true });
issueSupportSchema.index({ issue: 1, createdAt: -1 });

export const IssueSupportModel: Model<IssueSupport> = model<IssueSupport>("IssueSupport", issueSupportSchema);