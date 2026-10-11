import { Router } from "express";
import { login, me, register, updateMe, updateMyPassword } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { loginSchema, passwordChangeSchema, profileUpdateSchema, registerSchema } from "../validators/authValidators.js";

export const authRouter = Router();

authRouter.post("/register", validateBody(registerSchema), register);
authRouter.post("/login", validateBody(loginSchema), login);
authRouter.get("/me", requireAuth, me);
authRouter.patch("/me", requireAuth, validateBody(profileUpdateSchema), updateMe);
authRouter.patch("/me/password", requireAuth, validateBody(passwordChangeSchema), updateMyPassword);