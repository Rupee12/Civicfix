import { Router } from "express";
import { authorityQueue } from "../controllers/issueController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateQuery } from "../middleware/validateQuery.js";
import { authorityQueueSchema } from "../validators/workflowValidators.js";

export const authorityRouter = Router();
authorityRouter.get("/issues", requireAuth, requireRole("AUTHORITY"), validateQuery(authorityQueueSchema), authorityQueue);