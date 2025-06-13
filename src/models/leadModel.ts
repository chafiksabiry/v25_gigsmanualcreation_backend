import { Document, model, Schema } from 'mongoose';
import mongoose from 'mongoose';

export interface ILead extends Document {
  id: string;
  Activity_Tag: string | null;
  Deal_Name: string;
  Email_1: string;
  Last_Activity_Time: Date;
  Phone: string | null;
  Pipeline: string;
  Stage: string;
  companyId: mongoose.Types.ObjectId;
  gigId: mongoose.Types.ObjectId;
  refreshToken: string;
  userId: mongoose.Types.ObjectId;
  updatedAt: Date;
}

export const LeadSchema = new Schema<ILead>(
  {
    id: { type: String, required: true },
    Activity_Tag: { type: String, default: null },
    Deal_Name: { type: String, required: true },
    Email_1: { type: String, required: true },
    Last_Activity_Time: { type: Date, required: true },
    Phone: { type: String, default: null },
    Pipeline: { type: String, required: true },
    Stage: { type: String, required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, required: true },
    gigId: { type: mongoose.Schema.Types.ObjectId, required: true },
    refreshToken: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true }
  },
  { timestamps: true }
);

export const Lead = model<ILead>('Lead', LeadSchema); 