import { Schema, Types, model, type HydratedDocument, type Model } from "mongoose";
import type { MediaAsset } from "../types/issue.js";

export interface Resolution {
  issueId: Types.ObjectId;
  resolvedBy: Types.ObjectId;
  description: string;
  beforeMedia: { photos: MediaAsset[]; videos: MediaAsset[] };
  afterMedia: { photos: MediaAsset[]; videos: MediaAsset[] };
  completedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ResolutionDocument = HydratedDocument<Resolution>;

const mediaAssetSchema = new Schema<MediaAsset>({ url: String, mimeType: String, originalName: String, size: Number }, { _id: false });
const resolutionSchema = new Schema<Resolution>({
  issueId: { type: Schema.Types.ObjectId, ref: "Issue", required: true, index: true },
  resolvedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  description: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
  beforeMedia: { photos: { type: [mediaAssetSchema], default: [] }, videos: { type: [mediaAssetSchema], default: [] } },
  afterMedia: { photos: { type: [mediaAssetSchema], default: [] }, videos: { type: [mediaAssetSchema], default: [] } },
  completedAt: { type: Date, required: true },
}, { timestamps: true });

resolutionSchema.index({ issueId: 1, completedAt: -1 });

export const ResolutionModel: Model<Resolution> = model<Resolution>("Resolution", resolutionSchema);