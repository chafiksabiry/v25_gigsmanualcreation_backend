import express from "express";
import { GigController } from "../controllers/gigController";

const router = express.Router();

router.post("/", GigController.createGig);
router.get("/", GigController.getAllGigs);
router.get("/:id", GigController.getGigById);
router.get("/:id/destination-zone", GigController.getGigDestinationZoneById);
router.put("/:id", GigController.updateGig);
router.delete("/:id", GigController.deleteGig);

export default router;
