import { Request, Response } from "express";
import { GigService } from "../services/gigService";
import mongoose from "mongoose";
import { GigRepository } from "../repositories/gigRepository";

export class GigController {
  // static updateGig(arg0: string, updateGig: any) {
  //     throw new Error("Method not implemented.");
  // }
  private gigService: GigService;
  static gigService: any;

  constructor() {
    this.gigService = new GigService(new GigRepository());
  }

  static async createGig(req: Request, res: Response) {
    try {
      if (!req.body.title || !req.body.description) {
        return res.status(400).json({ message: "Title and description are required", data: null });
      }
      const newGig = await GigService.createGig(req.body);
      res.status(201).json({ message: "Gig created successfully", data: newGig });
    } catch (error) {
      console.error("Error in createGig:", error);
      res.status(500).json({ message: (error as Error).message || "Failed to create Gig", data: null });
    }
  }

  static async getAllGigs(req: Request, res: Response) {
    try {
      const gigs = await GigService.getAllGigs();
      res.status(200).json({ message: "Gigs retrieved successfully", data: gigs });
    } catch (error) {
      console.error("Error in getAllGigs:", error);
      res.status(500).json({ message: "Failed to retrieve gigs", data: null });
    }
  }

  static async getGigById(req: Request, res: Response) {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "Invalid Gig ID format", data: null });
      }

      const gig = await GigService.getGigById(req.params.id);
      if (!gig) {
        return res.status(404).json({ message: "Gig not found", data: null });
      }
      res.status(200).json({ message: "Gig retrieved successfully", data: gig });
    } catch (error) {
      console.error("Error in getGigById:", error);
      res.status(500).json({ message: "Failed to retrieve gig", data: null });
    }
  }

  static async updateGig(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const updateData = req.body;
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid Gig ID format", data: null });
      }

      const updatedGig = await GigService.updateGig(id, updateData);
      
      if (!updatedGig) {
        return res.status(404).json({ message: "Gig not found", data: null });
      }

      return res.status(200).json({
        message: "Gig updated successfully",
        data: updatedGig
      });
    } catch (error) {
      console.error('Error in updateGig:', error);
      return res.status(500).json({
        message: "Failed to update gig",
        data: null
      });
    }
  }

  static async deleteGig(req: Request, res: Response) {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "Invalid Gig ID format", data: null });
      }

      const deletedGig = await GigService.deleteGig(req.params.id);
      if (!deletedGig) {
        return res.status(404).json({ message: "Gig not found", data: null });
      }
      res.status(200).json({ message: "Gig deleted successfully", data: deletedGig });
    } catch (error) {
      console.error("Error in deleteGig:", error);
      res.status(500).json({ message: "Failed to delete gig", data: null });
    }
  }
}