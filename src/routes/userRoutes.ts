import { Router } from 'express';
import * as userController from '../controllers/userController.js';

export const userRouter = Router();

userRouter.route('/')
    .get(userController.listUsers)
    .post(userController.createUser);

userRouter.route('/:id')
    .get(userController.getUserById);
