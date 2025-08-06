import { Document, model, Schema } from 'mongoose';

export interface ITimezone extends Document {
  name: string;
  offset: string;
  abbreviation: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const TimezoneSchema = new Schema<ITimezone>(
  {
    name: { type: String, required: true, unique: true }, // ex: "Europe/Paris"
    offset: { type: String, required: true }, // ex: "+01:00"
    abbreviation: { type: String, required: true }, // ex: "CET"
    description: { type: String, required: false },
  },
  { timestamps: true }
);

export const Timezone = model<ITimezone>('Timezone', TimezoneSchema);