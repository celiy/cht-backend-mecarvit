import { Router } from "express";
import * as userController from "../controllers/userController.js";
import { protect } from "../middlewares/protect.js";

export const userRouter = Router();

userRouter.use(protect);

userRouter.route("/")
    .get(userController.listUsers)
    .post(userController.createUser);

userRouter.route("/:id")
    .get(userController.getUserById)
    .put(userController.updateUserById)
    .delete(userController.deleteUserById);
