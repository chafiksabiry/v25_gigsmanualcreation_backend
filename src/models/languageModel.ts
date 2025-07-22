import { Document, model, Schema } from 'mongoose';

export interface ILanguage extends Document {
  name: string;
  iso639_1: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const LanguageSchema = new Schema<ILanguage>(
  {
    name: { type: String, required: true, unique: true },
    iso639_1: { type: String, required: true, unique: true },
    description: { type: String, required: false },
  },
  { timestamps: true }
);

export const Language = model<ILanguage>('Language', LanguageSchema); 