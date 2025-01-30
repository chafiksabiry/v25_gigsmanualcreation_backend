import { z } from 'zod';

const gigSenioritySchema = z.object({
  level: z.string().min(1),
  yearsExperience: z.string().min(1)
});

const gigScheduleSchema = z.object({
  days: z.array(z.string()).min(1),
  hours: z.string().min(1),
  timeZones: z.array(z.string()).min(1),
  flexibility: z.array(z.string()),
  minimumHours: z.object({
    daily: z.number().optional(),
    weekly: z.number().optional(),
    monthly: z.number().optional()
  }).optional()
});

const gigCommissionSchema = z.object({
  base: z.string().min(1),
  baseAmount: z.string().min(1),
  currency: z.string().min(1),
  minimumVolume: z.object({
    amount: z.string().min(1),
    period: z.string().min(1),
    unit: z.string().min(1)
  })
});

const gigTeamStructureSchema = z.object({
  roleId: z.string().min(1),
  count: z.number().min(1),
  seniority: gigSenioritySchema
});

const gigTeamSchema = z.object({
  size: z.string().min(1),
  structure: z.array(gigTeamStructureSchema).min(1),
  territories: z.array(z.string()).min(1)
});

const createGigSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  category: z.string().min(1),
  seniority: gigSenioritySchema,
  schedule: gigScheduleSchema,
  commission: gigCommissionSchema,
  team: gigTeamSchema
});

const updateGigSchema = createGigSchema.partial();

export const validateCreateGig = (data: unknown) => createGigSchema.safeParse(data);
export const validateUpdateGig = (data: unknown) => updateGigSchema.safeParse(data);