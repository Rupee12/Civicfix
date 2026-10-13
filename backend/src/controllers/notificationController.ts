import type { RequestHandler } from "express";
import { getUnreadNotificationCount, listNotifications, markAllNotificationsRead, markNotificationRead } from "../services/notificationService.js";
import type { NotificationQuery } from "../validators/notificationValidators.js";

export const list: RequestHandler = async (request, response) => {
  const { page, limit, unread } = request.query as unknown as NotificationQuery;
  const unreadOnly = unread === "true";
  response.json({ success: true, message: "Notifications retrieved", data: await listNotifications(request.user!.userId, page, limit, unreadOnly) });
};
export const markRead: RequestHandler = async (request, response) => {
  response.json({ success: true, message: "Notification marked as read", data: { notification: await markNotificationRead(request.user!.userId, String(request.params.id)) } });
};
export const unreadCount: RequestHandler = async (request, response) => {
  response.json({ success: true, message: "Unread notification count retrieved", data: await getUnreadNotificationCount(request.user!.userId) });
};
export const markAllRead: RequestHandler = async (request, response) => {
  response.json({ success: true, message: "Notifications marked as read", data: await markAllNotificationsRead(request.user!.userId) });
};
