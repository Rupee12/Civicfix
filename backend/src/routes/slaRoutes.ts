import { Router } from "express";
import { configuration, overview, process, status, updateConfiguration } from "../controllers/slaController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { slaConfigurationSchema } from "../validators/slaValidators.js";
import { requireSlaProcessorAuth } from "../middleware/slaCronAuth.js";

export const slaRouter = Router();
slaRouter.get("/overview", requireAuth, requireRole("ADMIN", "AUTHORITY"), overview);
slaRouter.get("/configuration", requireAuth, requireRole("ADMIN"), configuration);
slaRouter.patch("/configuration", requireAuth, requireRole("ADMIN"), validateBody(slaConfigurationSchema), updateConfiguration);
slaRouter.post("/process", requireSlaProcessorAuth, process);
slaRouter.get("/issues/:id", requireAuth, requireRole("ADMIN", "AUTHORITY", "CITIZEN"), status);
