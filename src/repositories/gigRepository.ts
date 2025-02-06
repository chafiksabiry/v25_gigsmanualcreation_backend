import { Gig } from '../models/gigModel';  // Utilise le modèle Gig et non IGig

export class GigRepository {
  static async create(data: any) {
    const gig = new Gig(data);  // Crée une instance de Gig
    return await gig.save();
  }

  static async getById(id: string) {
    return await Gig.findById(id);  // Utilise Gig, pas IGig
  }

  static async getAll() {
    return await Gig.find();  // Utilise Gig, pas IGig
  }

  static async update(id: string, data: any) {
    return await Gig.findByIdAndUpdate(id, data, { new: true });  // Utilise Gig, pas IGig
  }

  static async delete(id: string) {
    return await Gig.findByIdAndDelete(id);  // Utilise Gig, pas IGig
  }
}
