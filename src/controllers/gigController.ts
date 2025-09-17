import { Request, Response } from "express";
import { GigService } from "../services/gigService";
import mongoose from "mongoose";
import { GigRepository } from "../repositories/gigRepository";
import countries from 'i18n-iso-countries';
import { Lead } from "../models/leadModel";
import { Country } from "../models/countryModel";

// Initialiser les pays en français et en anglais
countries.registerLocale(require('i18n-iso-countries/langs/fr.json'));
countries.registerLocale(require('i18n-iso-countries/langs/en.json'));

// Fonction pour obtenir le code alpha-2 à partir d'un nom de pays ou d'un code
const getCountryCode = (input: string): string | null => {
  // Si c'est déjà un code alpha-2 valide, le retourner en majuscules
  if (countries.isValid(input) && input.length === 2) {
    return input.toUpperCase();
  }
  
  // Essayer de trouver le code à partir du nom du pays en français
  let code = countries.getAlpha2Code(input, 'fr');
  if (!code) {
    // Si pas trouvé en français, essayer en anglais
    code = countries.getAlpha2Code(input, 'en');
  }
  return code ? code.toUpperCase() : null;
};

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

      // Valider que destination_zone est un ObjectId valide si fourni
      if (req.body.destination_zone && !mongoose.Types.ObjectId.isValid(req.body.destination_zone)) {
        return res.status(400).json({ 
          message: "destination_zone must be a valid MongoDB ObjectId", 
          data: null 
        });
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

  static async getActiveGigs(req: Request, res: Response) {
    try {
      const activeGigs = await GigService.getActiveGigs();
      res.status(200).json({ message: "Active gigs retrieved successfully", data: activeGigs });
    } catch (error) {
      console.error("Error in getActiveGigs:", error);
      res.status(500).json({ message: "Failed to retrieve active gigs", data: null });
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

  static async getGigDetailsById(req: Request, res: Response) {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "Invalid Gig ID format", data: null });
      }

      const gigDetails = await GigService.getGigDetailsById(req.params.id);
      if (!gigDetails) {
        return res.status(404).json({ message: "Gig not found", data: null });
      }
      res.status(200).json({ message: "Gig details retrieved successfully", data: gigDetails });
    } catch (error) {
      console.error("Error in getGigDetailsById:", error);
      res.status(500).json({ message: "Failed to retrieve gig details", data: null });
    }
  }

  static async updateGig(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const updateData = req.body;
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid Gig ID format", data: null });
      }

      // Valider que destination_zone est un ObjectId valide si fourni dans les données de mise à jour
      if (updateData.destination_zone && !mongoose.Types.ObjectId.isValid(updateData.destination_zone)) {
        return res.status(400).json({ 
          message: "destination_zone must be a valid MongoDB ObjectId", 
          data: null 
        });
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

  static async getGigDestinationZoneById(req: Request, res: Response) {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "Invalid Gig ID format", data: null });
      }

      const gig = await GigService.getGigById(req.params.id);
      if (!gig) {
        return res.status(404).json({ message: "Gig not found", data: null });
      }

      const destinationZone = gig.destination_zone;
      if (!destinationZone) {
        return res.status(404).json({ message: "Destination zone not set", data: null });
      }

      // Récupérer les informations du pays depuis la base de données
      const country = await Country.findById(destinationZone).lean();
      if (!country) {
        return res.status(404).json({ message: "Country not found in database", data: null });
      }
      
      res.status(200).json({ 
        message: "Gig destination zone retrieved successfully", 
        data: {
          id: country._id,
          code: country.cca2,
          name: country.name.common,
          officialName: country.name.official
        }
      });
    } catch (error) {
      console.error("Error in getGigDestinationZoneById:", error);
      res.status(500).json({ message: "Failed to retrieve gig destination zone", data: null });
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

  static async getGigsByUserId(req: Request, res: Response) {
    try {
      const userId = req.params.userId;
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid User ID format", data: null });
      }

      const gigs = await GigService.getGigsByUserId(userId);
      res.status(200).json({ message: "Gigs retrieved successfully", data: gigs });
    } catch (error) {
      console.error("Error in getGigsByUserId:", error);
      res.status(500).json({ message: "Failed to retrieve gigs", data: null });
    }
  }

  static async getGigsByCompanyId(req: Request, res: Response) {
    try {
      const companyId = req.params.companyId;
      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({ message: "Invalid Company ID format", data: null });
      }

      const gigs = await GigService.getGigsByCompanyId(companyId);
      res.status(200).json({ message: "Gigs retrieved successfully", data: gigs });
    } catch (error) {
      console.error("Error in getGigsByCompanyId:", error);
      res.status(500).json({ message: "Failed to retrieve gigs", data: null });
    }
  }

  static async hasCompanyGigs(req: Request, res: Response) {
    try {
      const companyId = req.params.companyId;
      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({ message: "Invalid Company ID format", data: null });
      }

      const gigs = await GigService.getGigsByCompanyId(companyId);
      const hasGigs = gigs.length > 0;
      
      res.status(200).json({ 
        message: "Company gig status retrieved successfully", 
        data: { hasGigs } 
      });
    } catch (error) {
      console.error("Error in hasCompanyGigs:", error);
      res.status(500).json({ message: "Failed to check company gigs", data: null });
    }
  }

  static async hasCompanyLeads(req: Request, res: Response) {
    try {
      const companyId = req.params.companyId;
      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({ message: "Invalid Company ID format", data: null });
      }

      const leads = await Lead.find({ companyId });
      const hasLeads = leads.length > 0;
      
      res.status(200).json({ 
        message: "Company leads status retrieved successfully", 
        data: { hasLeads } 
      });
    } catch (error) {
      console.error("Error in hasCompanyLeads:", error);
      res.status(500).json({ message: "Failed to check company leads", data: null });
    }
  }

  static async getCompanyByUserId(req: Request, res: Response) {
    try {
      const userId = req.params.userId;
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid User ID format", data: null });
      }

      const company = await GigService.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found for this user", data: null });
      }

      res.status(200).json({ 
        message: "Company retrieved successfully", 
        data: company 
      });
    } catch (error) {
      console.error("Error in getCompanyByUserId:", error);
      res.status(500).json({ message: "Failed to retrieve company", data: null });
    }
  }

  static async getLastGigByCompanyId(req: Request, res: Response) {
    try {
      const companyId = req.params.companyId;
      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({ message: "Invalid Company ID format", data: null });
      }

      const lastGig = await GigService.getLastGigByCompanyId(companyId);
      if (!lastGig) {
        return res.status(404).json({ message: "No gigs found for this company", data: null });
      }

      res.status(200).json({ 
        message: "Last gig retrieved successfully", 
        data: lastGig 
      });
    } catch (error) {
      console.error("Error in getLastGigByCompanyId:", error);
      res.status(500).json({ message: "Failed to retrieve last gig", data: null });
    }
  }

  static async uploadDalleImageToCloudinary(req: Request, res: Response) {
    try {
      const { dallEUrl, title } = req.body;

      if (!dallEUrl) {
        return res.status(400).json({ 
          message: "DALL-E URL is required", 
          data: null 
        });
      }

      if (!title) {
        return res.status(400).json({ 
          message: "Title is required", 
          data: null 
        });
      }

      // Cloudinary configuration
      const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || 'bf1katla';
      const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dyqg8x26j';

      // Fetch the image from DALL-E URL (server-side, no CORS issues)
      const imageResponse = await fetch(dallEUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image from DALL-E: ${imageResponse.statusText}`);
      }

      const imageBuffer = await imageResponse.arrayBuffer();
      
      // Convert to base64 for Cloudinary upload
      const base64Image = Buffer.from(imageBuffer).toString('base64');
      const dataURI = `data:image/png;base64,${base64Image}`;

      // Upload to Cloudinary using data URI
      const formData = new FormData();
      formData.append('file', dataURI);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      const cloudinaryResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!cloudinaryResponse.ok) {
        const errorData = await cloudinaryResponse.json() as any;
        throw new Error(errorData.error?.message || `Cloudinary error: ${cloudinaryResponse.statusText}`);
      }

      const result = await cloudinaryResponse.json() as any;
      
      if (result.secure_url) {
        res.status(200).json({ 
          message: "Image uploaded to Cloudinary successfully", 
          data: { url: result.secure_url } 
        });
      } else {
        throw new Error('No URL returned from Cloudinary');
      }

    } catch (error) {
      console.error("Error in uploadDalleImageToCloudinary:", error);
      res.status(500).json({ 
        message: (error as Error).message || "Failed to upload image to Cloudinary", 
        data: null 
      });
    }
  }
}