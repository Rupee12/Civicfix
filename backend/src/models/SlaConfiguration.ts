import { Schema, model, type Model } from "mongoose";
import type { PriorityLevel } from "../types/issue.js";

export type SlaTargets = Record<PriorityLevel, number>;

export interface SlaConfiguration {
  key: "default";
  targets: SlaTargets;
  updatedBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const slaConfigurationSchema = new Schema<SlaConfiguration>({
  key: { type: String, enum: ["default"], unique: true, default: "default" },
  targets: {
    CRITICAL: { type: Number, required: true },
    HIGH: { type: Number, required: true },
    MEDIUM: { type: Number, required: true },
    LOW: { type: Number, required: true },
  },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

export const SlaConfigurationModel: Model<SlaConfiguration> = model<SlaConfiguration>("SlaConfiguration", slaConfigurationSchema);
