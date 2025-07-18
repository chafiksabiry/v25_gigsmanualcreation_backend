import { Gig as GigModel } from '../models/gigModel';
import { Model } from 'mongoose';
import { IGig } from '../models/gigModel';

export class GigRepository {
  private model: Model<IGig>;

  constructor() {
    this.model = GigModel;
  }

  static async create(data: any) {
    const gig = new GigModel(data);
    return await gig.save();
  }

  async findById(id: string): Promise<any> {
    return this.model.findById(id);
  }

  static async getAll() {
    return await GigModel.find();
  }

  async update(id: string, data: any): Promise<any> {
    return this.model.findByIdAndUpdate(
      id,
      data,
      {
        new: true,
        runValidators: true
      }
    );
  }

  static async delete(id: string) {
    return await GigModel.findByIdAndDelete(id);
  }

  static async getLastGigByCompanyId(companyId: string) {
    return await GigModel.findOne({ companyId })
      .sort({ createdAt: -1 })
      .limit(1);
  }
}
