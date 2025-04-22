import { Document, model, Schema } from 'mongoose';

export interface IGig extends Document {
  title: string;
  description: string;
  category: string;
  seniority: {
    level: string;
    yearsExperience: string;
  };
  skills: {
    professional: string[];
    technical: string[];
    soft: string[];
    languages: Array<{
      name: string;
      level: string;
    }>;
  };
  schedule: {
    days: string[];
    hours: string;
    timeZones: string[];
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
  createdAt: Date;
  updatedAt: Date;
}

export const GigSchema = new Schema<IGig>(
  {
    title: { type: String, required: false },
    description: { type: String, required: false },
    category: { type: String, required: false },
    seniority: {
      level: { type: String, required: false },
      yearsExperience: { type: String, required: false },
    },
    skills: {
      professional: [{ type: String }],
      technical: [{ type: String }],
      soft: [{ type: String }],
      languages: [{
        name: { type: String, required: true },
        level: { type: String, required: true }
      }]
    },
    schedule: {
      days: [{ type: String }],
      hours: { type: String, required: false },
      timeZones: [{ type: String }],
      flexibility: [{ type: String }],
      minimumHours: {
        daily: Number,
        weekly: Number,
        monthly: Number,
      },
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
  },
  { timestamps: true }
);


export const Gig = model<IGig>('Gig', GigSchema);
