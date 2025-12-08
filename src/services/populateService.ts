// Service pour populer les données avec les détails complets depuis l'API externe

const EXTERNAL_API_BASE = process.env.REP_URL || 'https://api-repcreationwizard.harx.ai/api';

// Types pour les réponses de l'API externe
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface Activity {
  _id: string;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
}

interface Industry {
  _id: string;
  name: string;
  description: string;
  isActive: boolean;
}

interface Language {
  _id: string;
  name: string;
  code: string;
  nativeName: string;
}

interface Skill {
  _id: string;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
}

interface PopulateOptions {
  activities?: boolean;
  industries?: boolean;
  languages?: boolean;
  skills?: boolean;
  timezones?: boolean;
}

export class PopulateService {
  /**
   * Populate un objet gig avec les détails complets
   */
  static async populateGigData(gigData: any, options: PopulateOptions = {}) {
    const populatedData = { ...gigData };

    try {
      // Populate activities
      if (options.activities && gigData.activities) {
        populatedData.activities = await this.populateActivities(gigData.activities);
      }

      // Populate industries
      if (options.industries && gigData.industries) {
        populatedData.industries = await this.populateIndustries(gigData.industries);
      }

      // Populate languages
      if (options.languages && gigData.skills?.languages) {
        populatedData.skills.languages = await this.populateLanguages(gigData.skills.languages);
      }

      // Populate skills
      if (options.skills && gigData.skills) {
        if (gigData.skills.soft) {
          populatedData.skills.soft = await this.populateSkills(gigData.skills.soft, 'soft');
        }
        if (gigData.skills.professional) {
          populatedData.skills.professional = await this.populateSkills(gigData.skills.professional, 'professional');
        }
        if (gigData.skills.technical) {
          populatedData.skills.technical = await this.populateSkills(gigData.skills.technical, 'technical');
        }
      }

      return populatedData;
    } catch (error) {
      console.error('Error populating gig data:', error);
      return gigData; // Return original data if populate fails
    }
  }

  /**
   * Populate activities with full details
   */
  private static async populateActivities(activityIds: string[]): Promise<Activity[]> {
    try {
      const response = await fetch(`${EXTERNAL_API_BASE}/activities`);
      const data = await response.json() as ApiResponse<Activity[]>;
      
      if (!data.success) return activityIds.map(id => ({ _id: id, name: 'Unknown Activity', description: '', category: '', isActive: true }));

      return activityIds.map(id => {
        const activity = data.data.find((a: Activity) => a._id === id);
        return activity || { _id: id, name: 'Unknown Activity', description: '', category: '', isActive: true };
      });
    } catch (error) {
      console.error('Error populating activities:', error);
      return activityIds.map(id => ({ _id: id, name: 'Unknown Activity', description: '', category: '', isActive: true }));
    }
  }

  /**
   * Populate industries with full details
   */
  private static async populateIndustries(industryIds: string[]): Promise<Industry[]> {
    try {
      const response = await fetch(`${EXTERNAL_API_BASE}/industries`);
      const data = await response.json() as ApiResponse<Industry[]>;
      
      if (!data.success) return industryIds.map(id => ({ _id: id, name: 'Unknown Industry', description: '', isActive: true }));

      return industryIds.map(id => {
        const industry = data.data.find((i: Industry) => i._id === id);
        return industry || { _id: id, name: 'Unknown Industry', description: '', isActive: true };
      });
    } catch (error) {
      console.error('Error populating industries:', error);
      return industryIds.map(id => ({ _id: id, name: 'Unknown Industry', description: '', isActive: true }));
    }
  }

  /**
   * Populate languages with full details
   */
  private static async populateLanguages(languageData: any[]): Promise<any[]> {
    try {
      const response = await fetch(`${EXTERNAL_API_BASE}/languages`);
      const data = await response.json() as ApiResponse<Language[]>;
      
      if (!data.success) return languageData;

      return languageData.map(langData => {
        const language = data.data.find((l: Language) => l._id === langData.language);
        return {
          ...langData,
          languageDetails: language || { _id: langData.language, name: 'Unknown Language', code: '', nativeName: '' }
        };
      });
    } catch (error) {
      console.error('Error populating languages:', error);
      return languageData;
    }
  }

  /**
   * Populate skills with full details
   */
  private static async populateSkills(skillsData: any[], skillType: 'soft' | 'professional' | 'technical'): Promise<any[]> {
    try {
      const response = await fetch(`${EXTERNAL_API_BASE}/skills/${skillType}`);
      const data = await response.json() as ApiResponse<Skill[]>;
      
      if (!data.success) return skillsData;

      return skillsData.map(skillData => {
        const skill = data.data.find((s: Skill) => s._id === skillData.skill);
        return {
          ...skillData,
          skillDetails: skill || { _id: skillData.skill, name: 'Unknown Skill', description: '', category: '', isActive: true }
        };
      });
    } catch (error) {
      console.error(`Error populating ${skillType} skills:`, error);
      return skillsData;
    }
  }

  /**
   * Endpoint pour récupérer des données populées
   */
  static async getPopulatedGig(gigId: string, options: PopulateOptions = {}) {
    // Cette méthode serait utilisée pour récupérer un gig complet
    // depuis votre base de données et le populer avec les détails
    
    // Exemple d'implémentation:
    // 1. Récupérer le gig depuis MongoDB
    // 2. Populer avec les détails depuis l'API externe
    // 3. Retourner le gig complet
    
    console.log(`Getting populated gig ${gigId} with options:`, options);
    // Implementation would go here
  }
}
