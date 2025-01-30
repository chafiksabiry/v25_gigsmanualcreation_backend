import { IGig } from '../../domain/entities/Gig';
import { IGigRepository } from '../../domain/repositories/IGigRepository';

export class GigService {
  constructor(private readonly gigRepository: IGigRepository) {}

  async createGig(gigData: Partial<IGig>): Promise<IGig> {
    return await this.gigRepository.create(gigData);
  }

  async getAllGigs(): Promise<IGig[]> {
    return await this.gigRepository.findAll();
  }

  async getGigById(id: string): Promise<IGig | null> {
    return await this.gigRepository.findById(id);
  }

  async updateGig(id: string, gigData: Partial<IGig>): Promise<IGig | null> {
    return await this.gigRepository.update(id, gigData);
  }

  async deleteGig(id: string): Promise<boolean> {
    return await this.gigRepository.delete(id);
  }
}