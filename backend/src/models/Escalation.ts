import { Schema, Types, model, type Model } from "mongoose";

export interface Escalation {
  issueId: Types.ObjectId;
  level: number;
  reason: string;
  previousAssignee?: Types.ObjectId;
  newAssignee?: Types.ObjectId;
  createdAt: Date;
}

const escalationSchema = new Schema<Escalation>({
  issueId: { type: Schema.Types.ObjectId, ref: "Issue", required: true, index: true },
  level: { type: Number, required: true },
  reason: { type: String, required: true, maxlength: 500 },
  previousAssignee: { type: Schema.Types.ObjectId, ref: "User" },
  newAssignee: { type: Schema.Types.ObjectId, ref: "User" },
}, { timestamps: { createdAt: true, updatedAt: false } });
escalationSchema.index({ issueId: 1, level: 1 }, { unique: true });
export const EscalationModel: Model<Escalation> = model<Escalation>("Escalation", escalationSchema);
