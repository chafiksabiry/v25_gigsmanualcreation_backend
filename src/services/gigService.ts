import { IGig, Gig } from "../models/gigModel";

export class GigService {
  static async createGig(gigData: any) {
    try {
      const newGig = new Gig(gigData);

      await newGig.save();

      return newGig;
    } catch (error) {
      console.error("Error in GigService:", error);
      throw new Error("Failed to create Gig");
    }
  }
}
