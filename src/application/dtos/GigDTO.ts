export interface CreateGigDTO {
  title: string;
  description: string;
  category: string;
  seniority: {
    level: string;
    yearsExperience: string;
  };
  schedule: {
    days: string[];
    hours: string;
    timeZones: string[];
    flexibility: string[];
    minimumHours?: {
      daily?: number;
      weekly?: number;
      monthly?: number;
    };
  };
  commission: {
    base: string;
    baseAmount: string;
    currency: string;
    minimumVolume: {
      amount: string;
      period: string;
      unit: string;
    };
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
}

export interface UpdateGigDTO extends Partial<CreateGigDTO> {}