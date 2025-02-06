import express from 'express';
import { GigController } from '../controllers/gigController';

const router = express.Router();


router.post(
  "/",
  GigController.createGig
);

export default router;
