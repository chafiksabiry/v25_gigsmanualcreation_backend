import { Model } from 'mongoose';
import { IGig } from '../../../../domain/entities/Gig';
import { IGigRepository } from '../../../../domain/repositories/IGigRepository';

export class GigRepository implements IGigRepository {
  constructor(private readonly model: Model<IGig>) {}

  async create(gig: Partial<IGig>): Promise<IGig> {
    const newGig = new this.model(gig);
    return await newGig.save();
  }

  async findById(id: string): Promise<IGig | null> {
    return await this.model.findById(id);
  }

  async findAll(): Promise<IGig[]> {
    return await this.model.find();
  }

  async update(id: string, gig: Partial<IGig>): Promise<IGig | null> {
    return await this.model.findByIdAndUpdate(id, gig, { new: true });
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id);
    return result !== null;
  }
}