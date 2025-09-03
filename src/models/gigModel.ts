import { Document, model, Schema } from 'mongoose';
import mongoose from 'mongoose';
import countries from 'i18n-iso-countries';

// Initialiser les pays en français
countries.registerLocale(require('i18n-iso-countries/langs/fr.json'));

// Fonction de validation pour les codes pays alpha-2
const validateCountryCode = (value: string) => {
  return countries.isValid(value) && value.length === 2;
};

export interface IGig extends Document {
  title: string;
  description: string;
  category: string;
  userId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  destination_zone: string;
  activities: mongoose.Types.ObjectId[];
  industries: mongoose.Types.ObjectId[];
  seniority: {
    level: string;
    yearsExperience: string;
  };
  skills: {
    professional: Array<{
      skill: mongoose.Types.ObjectId;
      level: number;
      details: string;
    }>;
    technical: Array<{
      skill: mongoose.Types.ObjectId;
      level: number;
      details: string;
    }>;
    soft: Array<{
      skill: mongoose.Types.ObjectId;
      level: number;
      details: string;
    }>;
    languages: Array<{
      language: mongoose.Types.ObjectId;
      proficiency: string;
      iso639_1: string;
    }>;
  };
  availability: {
    schedule: Array<{
      day: string;
      hours: {
        start: string;
        end: string;
      };
    }>;
    time_zone: mongoose.Types.ObjectId;
    flexibility: string[];
    minimumHours: {
      daily?: number;
      weekly?: number;
      monthly?: number;
    };
  };
  commission: {
    base: string;
    baseAmount: string;
    bonus?: string;
    bonusAmount?: string;
    structure?: string;
    currency: string;
    minimumVolume: {
      amount: string;
      period: string;
      unit: string;
    };
    transactionCommission?: {
      type: string;
      amount: string;
    };
    additionalDetails?: string;
  };
  leads: {
    types: Array<{
      type: 'hot' | 'warm' | 'cold';
      percentage: number;
      description: string;
      conversionRate?: number;
    }>;
    sources: string[];
  };
  team: {
    size: string;
    structure: Array<{
      roleId: string;
      count: number;
      seniority: {
        level: string;
        yearsExperience: string;
      };
    }>;
    territories: string[];
  };
  documentation: {
    product?: { name: string; url: string }[];
    process?: { name: string; url: string }[];
    training?: { name: string; url: string }[];
  };
  status: 'to_activate' | 'active' | 'inactive' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export const GigSchema = new Schema<IGig>(
  {
    title: { type: String, required: false },
    description: { type: String, required: false },
    category: { type: String, required: false },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
    destination_zone: { 
      type: String,
      validate: {
        validator: validateCountryCode,
        message: 'Le code pays doit être un code alpha-2 valide (ex: FR, US, DE)'
      }
    },
    activities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: false }],
    industries: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Industry', required: false }],
    seniority: {
      level: { type: String, required: false },
      yearsExperience: { type: String, required: false },
    },
    skills: {
      professional: [{
        skill: { type: mongoose.Schema.Types.ObjectId, ref: 'ProfessionalSkill', required: false },
        level: { type: Number, required: false },
        details: { type: String, required: false }
      }],
      technical: [{
        skill: { type: mongoose.Schema.Types.ObjectId, ref: 'TechnicalSkill', required: false },
        level: { type: Number, required: false },
        details: { type: String, required: false }
      }],
      soft: [{
        skill: { type: mongoose.Schema.Types.ObjectId, ref: 'SoftSkill', required: false },
        level: { type: Number, required: false },
        details: { type: String, required: false }
      }],
      languages: [{
        language: { type: mongoose.Schema.Types.ObjectId, ref: 'Language', required: false },
        proficiency: { type: String, required: false },
        iso639_1: { type: String, required: false }
      }]
    },
    availability: {
      schedule: [{
        day: { type: String, required: false },
        hours: {
          start: { type: String, required: false },
          end: { type: String, required: false }
        }
      }],
      time_zone: { type: mongoose.Schema.Types.ObjectId, ref: 'Timezone', required: false },
      flexibility: [{ type: String }],
      minimumHours: {
        daily: { type: Number, required: false },
        weekly: { type: Number, required: false },
        monthly: { type: Number, required: false }
      }
    },
    commission: {
      base: { type: String, required: false },
      baseAmount: { type: String, required: false },
      bonus: String,
      bonusAmount: String,
      structure: String,
      currency: { type: String, required: false },
      minimumVolume: {
        amount: { type: String, required: false },
        period: { type: String, required: false },
        unit: { type: String, required: false },
      },
      transactionCommission: {
        type: { type: String, required: false },
        amount: { type: String, required: false },
      },
      additionalDetails: { type: String, required: false },
    },
    leads: {
      types: [
        {
          type: { type: String, enum: ['hot', 'warm', 'cold'] },
          percentage: Number,
          description: String,
          conversionRate: Number,
        },
      ],
      sources: [{ type: String }],
    },
    team: {
      size: { type: String, required: false },
      structure: [
        {
          roleId: String,
          count: Number,
          seniority: {
            level: String,
            yearsExperience: String,
          },
        },
      ],
      territories: [{ type: String }],
    },
    documentation: {
      product: [
        {
          name: { type: String, required: false },
          url: { type: String, required: false },
        },
      ],
      process: [
        {
          name: { type: String, required: false },
          url: { type: String, required: false },
        },
      ],
      training: [
        {
          name: { type: String, required: false },
          url: { type: String, required: false },
        },
      ],
    },
    status: { 
      type: String, 
      enum: ['to_activate', 'active', 'inactive', 'archived'], 
      default: 'to_activate',
      required: true 
    },
  },
  { timestamps: true }
);


export const Gig = model<IGig>('Gig', GigSchema);
