import { Document, model, Schema } from 'mongoose';

// Professional Skill Model
export interface IProfessionalSkill extends Document {
  name: string;
  category?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const ProfessionalSkillSchema = new Schema<IProfessionalSkill>(
  {
    name: { type: String, required: true, unique: true },
    category: { type: String, required: false },
    description: { type: String, required: false },
  },
  { timestamps: true }
);

export const ProfessionalSkill = model<IProfessionalSkill>('ProfessionalSkill', ProfessionalSkillSchema);

// Technical Skill Model
export interface ITechnicalSkill extends Document {
  name: string;
  category?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const TechnicalSkillSchema = new Schema<ITechnicalSkill>(
  {
    name: { type: String, required: true, unique: true },
    category: { type: String, required: false },
    description: { type: String, required: false },
  },
  { timestamps: true }
);

export const TechnicalSkill = model<ITechnicalSkill>('TechnicalSkill', TechnicalSkillSchema);

// Soft Skill Model
export interface ISoftSkill extends Document {
  name: string;
  category?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const SoftSkillSchema = new Schema<ISoftSkill>(
  {
    name: { type: String, required: true, unique: true },
    category: { type: String, required: false },
    description: { type: String, required: false },
  },
  { timestamps: true }
);

export const SoftSkill = model<ISoftSkill>('SoftSkill', SoftSkillSchema);