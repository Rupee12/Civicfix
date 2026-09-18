import { Schema, Types, model, type HydratedDocument, type Model } from "mongoose";

export const VERIFICATION_VOTES = ["RESOLVED", "NOT_RESOLVED"] as const;
export type VerificationVote = (typeof VERIFICATION_VOTES)[number];

export interface IssueVerification {
  issue: Types.ObjectId;
  user: Types.ObjectId;
  vote: VerificationVote;
  comment?: string;
  history: { vote: VerificationVote; comment?: string; changedAt: Date }[];
  createdAt: Date;
  updatedAt: Date;
}

export type IssueVerificationDocument = HydratedDocument<IssueVerification>;

const historySchema = new Schema({
  vote: { type: String, enum: VERIFICATION_VOTES, required: true },
  comment: { type: String, trim: true, maxlength: 1000 },
  changedAt: { type: Date, default: Date.now },
}, { _id: false });

const issueVerificationSchema = new Schema<IssueVerification>({
  issue: { type: Schema.Types.ObjectId, ref: "Issue", required: true },
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  vote: { type: String, enum: VERIFICATION_VOTES, required: true },
  comment: { type: String, trim: true, maxlength: 1000 },
  history: { type: [historySchema], default: [] },
}, { timestamps: true });

issueVerificationSchema.index({ issue: 1, user: 1 }, { unique: true });
issueVerificationSchema.index({ issue: 1, vote: 1 });

export const IssueVerificationModel: Model<IssueVerification> = model<IssueVerification>("IssueVerification", issueVerificationSchema);
