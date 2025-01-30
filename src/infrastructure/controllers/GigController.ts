import { Request, Response } from 'express';
import { GigService } from '../../application/services/GigService';
import { CreateGigDTO, UpdateGigDTO } from '../../application/dtos/GigDTO';
import { validateCreateGig, validateUpdateGig } from '../validators/gigValidators';

export class GigController {
  constructor(private readonly gigService: GigService) {}

  async create(req: Request, res: Response) {
    try {
      const validationResult = validateCreateGig(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: validationResult.error.issues 
        });
      }

      const gigData: CreateGigDTO = validationResult.data;
      const gig = await this.gigService.createGig(gigData);
      res.status(201).json(gig);
    } catch (error) {
      console.error('Create gig error:', error);
      res.status(500).json({ error: 'Failed to create gig' });
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      const gigs = await this.gigService.getAllGigs();
      res.json(gigs);
    } catch (error) {
      console.error('Find all gigs error:', error);
      res.status(500).json({ error: 'Failed to fetch gigs' });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const gig = await this.gigService.getGigById(req.params.id);
      if (!gig) {
        return res.status(404).json({ error: 'Gig not found' });
      }
      res.json(gig);
    } catch (error) {
      console.error('Find gig by id error:', error);
      res.status(500).json({ error: 'Failed to fetch gig' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const validationResult = validateUpdateGig(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: validationResult.error.issues 
        });
      }

      const gigData: UpdateGigDTO = validationResult.data;
      const gig = await this.gigService.updateGig(req.params.id, gigData);
      if (!gig) {
        return res.status(404).json({ error: 'Gig not found' });
      }
      res.json(gig);
    } catch (error) {
      console.error('Update gig error:', error);
      res.status(500).json({ error: 'Failed to update gig' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const success = await this.gigService.deleteGig(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Gig not found' });
      }
      res.status(204).send();
    } catch (error) {
      console.error('Delete gig error:', error);
      res.status(500).json({ error: 'Failed to delete gig' });
    }
  }
}