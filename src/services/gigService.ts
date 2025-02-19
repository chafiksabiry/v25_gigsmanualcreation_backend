import { Gig, IGig } from "../models/gigModel";
import mongoose from "mongoose";

export class GigService {
  static async createGig(gigData: any) {
    try {
      const newGig = new Gig(gigData);
      await newGig.save();
      return newGig;
    } catch (error: any) {
      console.error("Error in createGig:", error);
      if (error.name === "ValidationError") {
        throw new Error("Validation failed: " + Object.values(error.errors).map((err: any) => err.message).join(", "));
      }
      throw new Error("Failed to create Gig");
    }
  }

  static async getAllGigs() {
    try {
      return await Gig.find();
    } catch (error) {
      console.error("Error in getAllGigs:", error);
      throw new Error("Failed to retrieve gigs");
    }
  }

  static async getGigById(id: string) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid Gig ID format");
      }

      const gig = await Gig.findById(id);
      if (!gig) {
        throw new Error("Gig not found");
      }
      return gig;
    } catch (error) {
      console.error("Error in getGigById:", error);
      throw new Error("Failed to retrieve gig");
    }
  }

  static async updateGig(id: string, gigData: any) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid Gig ID format");
      }

      const updatedGig = await Gig.findByIdAndUpdate(id, gigData, { new: true, runValidators: true });
      if (!updatedGig) {
        throw new Error("Gig not found");
      }
      return updatedGig;
    } catch (error: any) {
      console.error("Error in updateGig:", error);
      if (error.name === "ValidationError") {
        throw new Error("Validation failed: " + Object.values(error.errors).map((err: any) => err.message).join(", "));
      }
      throw new Error("Failed to update gig");
    }
  }

  static async deleteGig(id: string) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid Gig ID format");
      }

      const deletedGig = await Gig.findByIdAndDelete(id);
      if (!deletedGig) {
        throw new Error("Gig not found");
      }
      return deletedGig;
    } catch (error) {
      console.error("Error in deleteGig:", error);
      throw new Error("Failed to delete gig");
    }
  }
}
