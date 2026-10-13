import { z } from "zod";

export const notificationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
  unread: z.enum(["true", "false"]).default("false"),
});
export type NotificationQuery = z.infer<typeof notificationQuerySchema>;
