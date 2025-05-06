import { Gig, IGig } from "../models/gigModel";
import mongoose from "mongoose";
import { GigRepository } from '../repositories/gigRepository';

export class GigService {
  private gigRepository: GigRepository;

  constructor(gigRepository: GigRepository) {
    this.gigRepository = gigRepository;
  }

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

  static async updateGig(id: string, updateData: any) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid Gig ID format");
      }

      // Utiliser $set pour la mise à jour partielle
      const updatedGig = await Gig.findByIdAndUpdate(
        id,
        { $set: updateData },
        {
          new: true,
          runValidators: true
        }
      );

      if (!updatedGig) {
        throw new Error("Gig not found");
      }

      return updatedGig;
    } catch (error) {
      console.error("Error in updateGig:", error);
      throw error;
    }
  }

  async updateGig(id: string, updateData: any): Promise<any> {
    try {
      const existingGig = await this.gigRepository.findById(id);
      if (!existingGig) {
        throw new Error('Gig not found');
      }

      const updatedGig = await this.gigRepository.update(id, updateData);
      return updatedGig;
    } catch (error) {
      throw error;
    }
  }

  private cleanUpdateData(data: Partial<IGig>): Partial<IGig> {
    // Supprimer les champs que vous ne voulez pas mettre à jour
    const {
      createdAt,
      updatedAt,
      __v,
      _id,
      ...cleanedData
    } = data as any;

    return cleanedData;
  }

  static async getGigDestinationZoneById(id: string) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid Gig ID format");
      }

      const gig = await Gig.findById(id).select('destination_zone');
      if (!gig) {
        throw new Error("Gig not found");
      }
      return gig.destination_zone;
    } catch (error) {
      console.error("Error in getGigDestinationZoneById:", error);
      throw new Error("Failed to retrieve gig destination zone");
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

  static async getGigsByUserId(userId: string) {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error("Invalid User ID format");
      }

      const gigs = await Gig.find({ userId });
      return gigs;
    } catch (error) {
      console.error("Error in getGigsByUserId:", error);
      throw new Error("Failed to retrieve gigs");
    }
  }

  static async getGigsByCompanyId(companyId: string) {
    try {
      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        throw new Error("Invalid Company ID format");
      }

      const gigs = await Gig.find({ companyId });
      return gigs;
    } catch (error) {
      console.error("Error in getGigsByCompanyId:", error);
      throw new Error("Failed to retrieve gigs");
    }
  }
}
