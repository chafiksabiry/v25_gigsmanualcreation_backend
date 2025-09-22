import { Document, model, Schema } from 'mongoose';

export interface ISector extends Document {
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const SectorSchema = new Schema<ISector>(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, required: false },
  },
  { timestamps: true }
);

export const Sector = model<ISector>('Sector', SectorSchema);
