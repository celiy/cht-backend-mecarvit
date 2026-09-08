import { Router } from "express";
import * as authController from "../controllers/authController.js";
import { protect } from "../middlewares/protect.js";

export const authRouter = Router();

authRouter.post("/register", authController.register);
authRouter.post("/login", authController.login);
authRouter.get("/me", protect, authController.me);
