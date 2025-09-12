import { Request, Response } from 'express';
import { Country, ICountry } from '../models/countryModel';

export class CountryController {
  /**
   * Récupérer tous les pays
   */
  static async getAllCountries(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      // Filtres optionnels
      const search = req.query.search as string;
      let query = {};

      if (search) {
        query = {
          $or: [
            { 'name.common': { $regex: search, $options: 'i' } },
            { 'name.official': { $regex: search, $options: 'i' } },
            { cca2: { $regex: search, $options: 'i' } }
          ]
        };
      }

      const countries = await Country.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ 'name.common': 1 });

      const total = await Country.countDocuments(query);

      res.status(200).json({
        success: true,
        data: countries,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error: any) {
      console.error('Error fetching countries:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch countries',
        message: error.message
      });
    }
  }

  /**
   * Récupérer un pays par ID
   */
  static async getCountryById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const country = await Country.findById(id);

      if (!country) {
        return res.status(404).json({
          success: false,
          error: 'Country not found'
        });
      }

      res.status(200).json({
        success: true,
        data: country
      });
    } catch (error: any) {
      console.error('Error fetching country:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch country',
        message: error.message
      });
    }
  }

  /**
   * Récupérer un pays par code CCA2
   */
  static async getCountryByCode(req: Request, res: Response) {
    try {
      const { code } = req.params;
      const country = await Country.findOne({ cca2: code.toUpperCase() });

      if (!country) {
        return res.status(404).json({
          success: false,
          error: 'Country not found'
        });
      }

      res.status(200).json({
        success: true,
        data: country
      });
    } catch (error: any) {
      console.error('Error fetching country by code:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch country',
        message: error.message
      });
    }
  }

  /**
   * Créer un nouveau pays
   */
  static async createCountry(req: Request, res: Response) {
    try {
      const countryData = req.body;

      // Vérifier si le code CCA2 existe déjà
      const existingCountry = await Country.findOne({ cca2: countryData.cca2?.toUpperCase() });
      if (existingCountry) {
        return res.status(400).json({
          success: false,
          error: 'Country with this CCA2 code already exists'
        });
      }

      // Normaliser le code CCA2
      if (countryData.cca2) {
        countryData.cca2 = countryData.cca2.toUpperCase();
      }

      const country = new Country(countryData);
      await country.save();

      res.status(201).json({
        success: true,
        data: country,
        message: 'Country created successfully'
      });
    } catch (error: any) {
      console.error('Error creating country:', error);
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create country',
        message: error.message
      });
    }
  }

  /**
   * Mettre à jour un pays
   */
  static async updateCountry(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Normaliser le code CCA2 si présent
      if (updateData.cca2) {
        updateData.cca2 = updateData.cca2.toUpperCase();
        
        // Vérifier si le nouveau code CCA2 existe déjà (sauf pour le pays actuel)
        const existingCountry = await Country.findOne({ 
          cca2: updateData.cca2,
          _id: { $ne: id }
        });
        if (existingCountry) {
          return res.status(400).json({
            success: false,
            error: 'Country with this CCA2 code already exists'
          });
        }
      }

      const country = await Country.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!country) {
        return res.status(404).json({
          success: false,
          error: 'Country not found'
        });
      }

      res.status(200).json({
        success: true,
        data: country,
        message: 'Country updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating country:', error);
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update country',
        message: error.message
      });
    }
  }

  /**
   * Supprimer un pays
   */
  static async deleteCountry(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const country = await Country.findByIdAndDelete(id);

      if (!country) {
        return res.status(404).json({
          success: false,
          error: 'Country not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Country deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting country:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete country',
        message: error.message
      });
    }
  }

  /**
   * Créer plusieurs pays en une fois (bulk insert)
   */
  static async createMultipleCountries(req: Request, res: Response) {
    try {
      const countriesData = req.body.countries;

      if (!Array.isArray(countriesData)) {
        return res.status(400).json({
          success: false,
          error: 'Countries data must be an array'
        });
      }

      // Filtrer et valider les pays avant insertion
      const validCountries = [];
      const invalidCountries = [];

      for (let i = 0; i < countriesData.length; i++) {
        const country = countriesData[i];
        
        // Vérifier les champs requis
        if (!country || 
            !country.name || 
            !country.name.common || 
            !country.name.official || 
            !country.cca2) {
          invalidCountries.push({
            index: i,
            data: country,
            error: 'Missing required fields: name.common, name.official, or cca2'
          });
          continue;
        }

        // Normaliser le code CCA2
        const normalizedCountry = {
          ...country,
          cca2: country.cca2.toUpperCase()
        };

        validCountries.push(normalizedCountry);
      }

      if (validCountries.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid countries found',
          invalidCountries: invalidCountries
        });
      }

      // Insérer les pays valides
      const countries = await Country.insertMany(validCountries, { ordered: false });

      const response: any = {
        success: true,
        data: countries,
        message: `${countries.length} countries created successfully`
      };

      // Ajouter les informations sur les pays invalides si il y en a
      if (invalidCountries.length > 0) {
        response.warnings = {
          invalidCountries: invalidCountries,
          message: `${invalidCountries.length} countries were skipped due to validation errors`
        };
      }

      res.status(201).json(response);
    } catch (error: any) {
      console.error('Error creating multiple countries:', error);
      
      if (error.name === 'BulkWriteError') {
        const successfulInserts = error.result.insertedCount;
        return res.status(207).json({
          success: false,
          error: 'Some countries could not be created',
          inserted: successfulInserts,
          details: error.writeErrors
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create countries',
        message: error.message
      });
    }
  }
}
