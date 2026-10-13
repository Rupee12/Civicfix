import { Router } from "express";
import { list, markAllRead, markRead, unreadCount } from "../controllers/notificationController.js";
import { requireAuth } from "../middleware/auth.js";
import { validateQuery } from "../middleware/validateQuery.js";
import { notificationQuerySchema } from "../validators/notificationValidators.js";

export const notificationRouter = Router();
notificationRouter.use(requireAuth);
notificationRouter.get("/", validateQuery(notificationQuerySchema), list);
notificationRouter.get("/unread-count", unreadCount);
notificationRouter.patch("/read-all", markAllRead);
notificationRouter.patch("/:id/read", markRead);
