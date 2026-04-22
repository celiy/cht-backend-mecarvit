import { Router } from "express";
import { userRouter } from "./userRoutes.js";

export const apiRouter = Router();

apiRouter.use("/users", userRouter);
