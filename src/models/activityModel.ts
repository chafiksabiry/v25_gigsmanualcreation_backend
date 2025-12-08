import { Document, model, Schema } from 'mongoose';

export interface IActivity extends Document {
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const ActivitySchema = new Schema<IActivity>(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, required: false },
  },
  { timestamps: true }
);

export const Activity = model<IActivity>('Activity', ActivitySchema); 