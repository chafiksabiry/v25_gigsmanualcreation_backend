import express from "express";
import { GigController } from "../controllers/gigController";

const router = express.Router();

router.post("/", GigController.createGig);
router.get("/", GigController.getAllGigs);
router.get("/:id", GigController.getGigById);

// Gig Destination Zone
router.get("/:id/destination-zone", GigController.getGigDestinationZoneById);
router.put("/:id", GigController.updateGig);
router.delete("/:id", GigController.deleteGig);

// Get gigs by userId and companyId
router.get("/user/:userId", GigController.getGigsByUserId);
router.get("/company/:companyId", GigController.getGigsByCompanyId);
router.get("/company/:companyId/last", GigController.getLastGigByCompanyId);
router.get("/company/:companyId/has-gigs", GigController.hasCompanyGigs);
router.get("/company/:companyId/has-leads", GigController.hasCompanyLeads);

// Proxy route for DALL-E image upload to Cloudinary
router.post("/proxy/upload-dalle-image", GigController.uploadDalleImageToCloudinary);

export default router;
