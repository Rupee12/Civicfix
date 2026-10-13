import { Schema, Types, model, type HydratedDocument, type Model } from "mongoose";

export const NOTIFICATION_TYPES = ["ISSUE_ASSIGNED", "STATUS_CHANGED", "RESOLUTION_UPDATE", "VERIFICATION_REQUESTED", "ISSUE_REOPENED", "SLA_APPROACHING", "SLA_BREACHED", "ESCALATED"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface Notification {
  recipient: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityId?: Types.ObjectId;
  relatedEntityType?: "Issue";
  metadata?: Record<string, string>;
  readAt?: Date;
  eventKey: string;
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationDocument = HydratedDocument<Notification>;

const notificationSchema = new Schema<Notification>({
  recipient: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  type: { type: String, enum: NOTIFICATION_TYPES, required: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  message: { type: String, required: true, trim: true, maxlength: 500 },
  relatedEntityId: { type: Schema.Types.ObjectId, ref: "Issue" },
  relatedEntityType: { type: String, enum: ["Issue"] },
  metadata: { type: Map, of: String },
  readAt: Date,
  eventKey: { type: String, required: true },
}, { timestamps: true });

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, readAt: 1 });
notificationSchema.index({ recipient: 1, eventKey: 1 }, { unique: true });

export const NotificationModel: Model<Notification> = model<Notification>("Notification", notificationSchema);
