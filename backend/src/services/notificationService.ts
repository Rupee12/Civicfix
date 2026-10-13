import { Types } from "mongoose";
import { NotificationModel, type NotificationType } from "../models/Notification.js";
import { isDatabaseReady } from "../config/database.js";
import { ApiError } from "../utils/apiError.js";

export type NotificationInput = {
  recipient: Types.ObjectId | string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityId?: Types.ObjectId | string;
  relatedEntityType?: "Issue";
  metadata?: Record<string, string>;
  eventKey: string;
};

function ready() { if (!isDatabaseReady()) throw new ApiError(503, "Database is unavailable", "DATABASE_UNAVAILABLE"); }
function id(value: Types.ObjectId | string) { return value instanceof Types.ObjectId ? value : new Types.ObjectId(value); }

export async function createNotification(input: NotificationInput) {
  ready();
  return NotificationModel.findOneAndUpdate(
    { recipient: id(input.recipient), eventKey: input.eventKey },
    { $setOnInsert: { ...input, recipient: id(input.recipient), ...(input.relatedEntityId ? { relatedEntityId: id(input.relatedEntityId) } : {}) } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();
}

export async function listNotifications(userId: string, page: number, limit: number, unreadOnly: boolean) {
  ready();
  const filter = { recipient: new Types.ObjectId(userId), ...(unreadOnly ? { readAt: { $exists: false } } : {}) };
  const [items, total, unread] = await Promise.all([
    NotificationModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    NotificationModel.countDocuments(filter),
    NotificationModel.countDocuments({ recipient: filter.recipient, readAt: { $exists: false } }),
  ]);
  return { notifications: items.map((item) => ({ ...item, id: String(item._id) })), unreadCount: unread, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}
export async function getUnreadNotificationCount(userId: string) {
  ready();
  return { unreadCount: await NotificationModel.countDocuments({ recipient: userId, readAt: { $exists: false } }) };
}

export async function markNotificationRead(userId: string, notificationId: string) {
  ready();
  if (!Types.ObjectId.isValid(notificationId)) throw new ApiError(404, "Notification not found", "NOTIFICATION_NOT_FOUND");
  const notification = await NotificationModel.findOneAndUpdate({ _id: notificationId, recipient: userId }, { $set: { readAt: new Date() } }, { new: true }).lean();
  if (!notification) throw new ApiError(404, "Notification not found", "NOTIFICATION_NOT_FOUND");
  return { ...notification, id: String(notification._id) };
}

export async function markAllNotificationsRead(userId: string) {
  ready();
  const result = await NotificationModel.updateMany({ recipient: userId, readAt: { $exists: false } }, { $set: { readAt: new Date() } });
  return { updated: result.modifiedCount };
}
