import { Document, model, Schema } from 'mongoose';

export interface ILocalizedString {
  en?: string;
  fr?: string;
}

export interface IActivity extends Document {
  name: string;
  description?: string;
  name_i18n?: ILocalizedString;
  description_i18n?: ILocalizedString;
  createdAt: Date;
  updatedAt: Date;
}

const i18nStringSchema = new Schema<ILocalizedString>(
  {
    en: { type: String, trim: true, default: '' },
    fr: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

export const ActivitySchema = new Schema<IActivity>(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, required: false },
    name_i18n: { type: i18nStringSchema, required: false },
    description_i18n: { type: i18nStringSchema, required: false },
  },
  { timestamps: true }
);

export const Activity = model<IActivity>('Activity', ActivitySchema);
