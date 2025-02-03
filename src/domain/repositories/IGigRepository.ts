import { IGig } from '../entities/Gig';

export interface IGigRepository {
  create(gig: Partial<IGig>): Promise<IGig>;
  findById(id: string): Promise<IGig | null>;
  findAll(): Promise<IGig[]>;
  update(id: string, gig: Partial<IGig>): Promise<IGig | null>;
  delete(id: string): Promise<boolean>;
}