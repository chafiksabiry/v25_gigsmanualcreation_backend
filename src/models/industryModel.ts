import { Document, model, Schema } from 'mongoose';

export interface IIndustry extends Document {
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const IndustrySchema = new Schema<IIndustry>(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, required: false },
  },
  { timestamps: true }
);

export const Industry = model<IIndustry>('Industry', IndustrySchema); 