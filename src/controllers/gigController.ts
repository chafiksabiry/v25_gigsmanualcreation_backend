// import { Request, Response } from "express";
// import { GigService } from "../services/gigService";
// import cloudinary from "../config/cloudinary";

// export class GigController {
//   static async createGig(req: Request, res: Response) {
//     try {
//       const files = req.files as { [fieldname: string]: Express.Multer.File[] };

//       // Check if files are present
//       if (!files.product && !files.process && !files.training) {
//         return res.status(400).json({ message: "Aucun fichier reçu" });
//       }

//       // Function to upload files to Cloudinary
//       const uploadDocs = async (files: Express.Multer.File[]) => {
//         return Promise.all(
//           files.map(async (file) => {
//             const result = await cloudinary.uploader.upload(file.path, {
//               folder: "gigs/docs",
//             });
//             return { name: file.originalname, url: result.secure_url };
//           })
//         );
//       };

//       // Upload files for each category
//       const uploadedDocs = {
//         product: files.product ? await uploadDocs(files.product) : [],
//         process: files.process ? await uploadDocs(files.process) : [],
//         training: files.training ? await uploadDocs(files.training) : [],
//       };

//       // Prepare gig data with uploaded file URLs
//       const gigData = {
//         ...req.body,
//         documentation: {
//           product: uploadedDocs.product,
//           process: uploadedDocs.process,
//           training: uploadedDocs.training,
//         },
//       };

//       // Create the gig
//       const gig = await GigService.createGig(gigData);
//       res.status(201).json(gig);
//     } catch (error) {
//       res.status(500).json({ message: (error as Error).message });
//     }
//   }
// }



// import { Request, Response } from "express";
// import { GigService } from "../services/gigService";

import { Request, Response } from 'express';
import { Gig } from '../models/gigModel';

export class GigController {
  // Fonction pour créer un nouveau gig
  static async createGig(req: Request, res: Response): Promise<Response> {
    try {
      const {
        title,
        description,
        category,
        seniority,
        schedule,
        commission,
        leads,
        team,
        documentation,
      } = req.body;

      // Créer un nouvel objet Gig avec les données reçues
      const newGig = new Gig({
        title,
        description,
        category,
        seniority,
        schedule,
        commission,
        leads,
        team,
        documentation,
      });

      // Sauvegarder le nouveau gig dans la base de données
      await newGig.save();

      // Retourner une réponse avec le gig créé
      return res.status(201).json({
        message: 'Gig created successfully',
        gig: newGig,
      });
    } catch (error) {
      // En cas d'erreur, retourner une erreur
      console.error('Error creating gig:', error);
      return res.status(500).json({
        message: 'Error creating gig',
        error: (error as Error).message,
      });
    }
  }
}
