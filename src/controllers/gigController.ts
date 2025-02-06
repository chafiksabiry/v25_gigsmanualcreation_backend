import { Request, Response } from "express";
import { GigService } from "../services/gigService";

export class GigController {
  static async createGig(req: Request, res: Response) {
    try {
      // Appel du service pour créer le Gig sans fichiers
      const newGig = await GigService.createGig(req.body);
      
      // Réponse avec le nouvel objet Gig créé
      res.status(201).json(newGig);
    } catch (error) {
      console.error("Error in createGig:", error);
      res.status(500).json({ message: (error as Error).message });
    }
  }
}
