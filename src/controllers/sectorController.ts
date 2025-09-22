import { Request, Response } from 'express';
import { Sector, ISector } from '../models/sectorModel';

export class SectorController {
  /**
   * Récupérer tous les secteurs
   */
  static async getAllSectors(req: Request, res: Response) {
    try {
      // Filtres optionnels
      const search = req.query.search as string;
      let query = {};

      if (search) {
        query = {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
          ]
        };
      }

      const sectors = await Sector.find(query)
        .sort({ name: 1 });

      res.status(200).json({
        success: true,
        data: sectors
      });
    } catch (error: any) {
      console.error('Error fetching sectors:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch sectors',
        message: error.message
      });
    }
  }

  /**
   * Récupérer un secteur par ID
   */
  static async getSectorById(req: Request, res: Response) {
    try {
      const sectorId = req.params.id;
      const sector = await Sector.findById(sectorId);

      if (!sector) {
        return res.status(404).json({
          success: false,
          error: 'Sector not found'
        });
      }

      res.status(200).json({
        success: true,
        data: sector
      });
    } catch (error: any) {
      console.error('Error fetching sector by ID:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch sector',
        message: error.message
      });
    }
  }

  /**
   * Créer un nouveau secteur
   */
  static async createSector(req: Request, res: Response) {
    try {
      const sectorData = req.body;
      
      // Vérifier si le secteur existe déjà
      const existingSector = await Sector.findOne({ name: sectorData.name });
      if (existingSector) {
        return res.status(400).json({
          success: false,
          error: 'Sector with this name already exists'
        });
      }

      const sector = new Sector(sectorData);
      await sector.save();

      res.status(201).json({
        success: true,
        data: sector,
        message: 'Sector created successfully'
      });
    } catch (error: any) {
      console.error('Error creating sector:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create sector',
        message: error.message
      });
    }
  }

  /**
   * Mettre à jour un secteur
   */
  static async updateSector(req: Request, res: Response) {
    try {
      const sectorId = req.params.id;
      const updateData = req.body;

      const sector = await Sector.findByIdAndUpdate(
        sectorId,
        updateData,
        { new: true, runValidators: true }
      );

      if (!sector) {
        return res.status(404).json({
          success: false,
          error: 'Sector not found'
        });
      }

      res.status(200).json({
        success: true,
        data: sector,
        message: 'Sector updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating sector:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update sector',
        message: error.message
      });
    }
  }

  /**
   * Supprimer un secteur
   */
  static async deleteSector(req: Request, res: Response) {
    try {
      const sectorId = req.params.id;

      const sector = await Sector.findByIdAndDelete(sectorId);

      if (!sector) {
        return res.status(404).json({
          success: false,
          error: 'Sector not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Sector deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting sector:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete sector',
        message: error.message
      });
    }
  }
}
