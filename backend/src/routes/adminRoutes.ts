import { Router } from "express";
import { analytics, authorities, createAuthorityController, createDepartmentController, departments, prioritySummary, updateAuthorityController, updateDepartmentController, workload } from "../controllers/adminController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { validateQuery } from "../middleware/validateQuery.js";
import { authorityCreateSchema, authorityUpdateSchema, departmentCreateSchema, departmentUpdateSchema } from "../validators/workflowValidators.js";
import { analyticsQuerySchema } from "../validators/analyticsValidators.js";

export const adminRouter = Router();
adminRouter.get("/priority", requireAuth, requireRole("ADMIN", "AUTHORITY"), prioritySummary);
adminRouter.get("/workload", requireAuth, requireRole("ADMIN"), workload);
adminRouter.get("/analytics", requireAuth, requireRole("ADMIN"), validateQuery(analyticsQuerySchema), analytics);
adminRouter.get("/departments", requireAuth, requireRole("ADMIN"), departments);
adminRouter.post("/departments", requireAuth, requireRole("ADMIN"), validateBody(departmentCreateSchema), createDepartmentController);
adminRouter.patch("/departments/:id", requireAuth, requireRole("ADMIN"), validateBody(departmentUpdateSchema), updateDepartmentController);
adminRouter.get("/authorities", requireAuth, requireRole("ADMIN"), authorities);
adminRouter.post("/authorities", requireAuth, requireRole("ADMIN"), validateBody(authorityCreateSchema), createAuthorityController);
adminRouter.patch("/authorities/:id", requireAuth, requireRole("ADMIN"), validateBody(authorityUpdateSchema), updateAuthorityController);