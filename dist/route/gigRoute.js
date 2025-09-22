"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const gigController_1 = require("../controllers/gigController");
const router = express_1.default.Router();
router.post("/", gigController_1.GigController.createGig);
router.get("/", gigController_1.GigController.getAllGigs);
router.get("/active", gigController_1.GigController.getActiveGigs);
router.get("/:id", gigController_1.GigController.getGigById);
router.get("/:id/details", gigController_1.GigController.getGigDetailsById);
// Gig Destination Zone
router.get("/:id/destination-zone", gigController_1.GigController.getGigDestinationZoneById);
router.put("/:id", gigController_1.GigController.updateGig);
router.delete("/:id", gigController_1.GigController.deleteGig);
// Get gigs by userId and companyId
router.get("/user/:userId", gigController_1.GigController.getGigsByUserId);
router.get("/company/:companyId", gigController_1.GigController.getGigsByCompanyId);
router.get("/company/:companyId/last", gigController_1.GigController.getLastGigByCompanyId);
router.get("/company/:companyId/has-gigs", gigController_1.GigController.hasCompanyGigs);
router.get("/company/:companyId/has-leads", gigController_1.GigController.hasCompanyLeads);
// Proxy route for DALL-E image upload to Cloudinary
router.post("/proxy/upload-dalle-image", gigController_1.GigController.uploadDalleImageToCloudinary);
exports.default = router;
