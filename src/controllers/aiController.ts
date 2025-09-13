import { Request, Response } from 'express';
import { Country } from '../models/countryModel';
import { AIService, TimezoneGenerationRequest } from '../services/aiService';
import { PopulateService } from '../services/populateService';

// Configuration de l'API externe
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

// Fonctions pour récupérer les données depuis l'API externe
async function fetchActivities(): Promise<Activity[]> {
  try {
    const response = await fetch(`${EXTERNAL_API_BASE}/activities`);
    const data = await response.json() as ApiResponse<Activity[]>;
    return data.success ? data.data : [];
  } catch (error) {
    console.error('Error fetching activities:', error);
    return [];
  }
}

async function fetchIndustries(): Promise<Industry[]> {
  try {
    const response = await fetch(`${EXTERNAL_API_BASE}/industries`);
    const data = await response.json() as ApiResponse<Industry[]>;
    return data.success ? data.data : [];
  } catch (error) {
    console.error('Error fetching industries:', error);
    return [];
  }
}

async function fetchLanguages(): Promise<Language[]> {
  try {
    const response = await fetch(`${EXTERNAL_API_BASE}/languages`);
    const data = await response.json() as ApiResponse<Language[]>;
    return data.success ? data.data : [];
  } catch (error) {
    console.error('Error fetching languages:', error);
    return [];
  }
}

async function fetchSkills(): Promise<{ soft: Skill[]; professional: Skill[]; technical: Skill[] }> {
  try {
    const [softResponse, professionalResponse, technicalResponse] = await Promise.all([
      fetch(`${EXTERNAL_API_BASE}/skills/soft`),
      fetch(`${EXTERNAL_API_BASE}/skills/professional`),
      fetch(`${EXTERNAL_API_BASE}/skills/technical`)
    ]);

    const [softData, professionalData, technicalData] = await Promise.all([
      softResponse.json() as Promise<ApiResponse<Skill[]>>,
      professionalResponse.json() as Promise<ApiResponse<Skill[]>>,
      technicalResponse.json() as Promise<ApiResponse<Skill[]>>
    ]);

    return {
      soft: softData.success ? softData.data : [],
      professional: professionalData.success ? professionalData.data : [],
      technical: technicalData.success ? technicalData.data : []
    };
  } catch (error) {
    console.error('Error fetching skills:', error);
    return { soft: [], professional: [], technical: [] };
  }
}

interface Timezone {
  _id: string;
  countryCode: string;
  countryName: string;
  zoneName: string;
  gmtOffset: number;
}

async function fetchTimezones(): Promise<Timezone[]> {
  try {
    const response = await fetch(`${EXTERNAL_API_BASE}/timezones`);
    const data = await response.json() as ApiResponse<Timezone[]>;
    return data.success ? data.data : [];
  } catch (error) {
    console.error('Error fetching timezones:', error);
    return [];
  }
}

// Fonction pour récupérer les pays depuis l'API externe
async function fetchCountries(): Promise<any[]> {
  try {
    const countriesApiUrl = process.env.COUNTRIES_API_URL || 'http://localhost:5004/api/countries';
    console.log(`🔍 Tentative de connexion à: ${countriesApiUrl}`);
    const response = await fetch(countriesApiUrl);
    const data = await response.json() as ApiResponse<any[]>;
    
    if (data.success && data.data) {
      console.log(`✅ ${data.data.length} pays récupérés depuis l'API externe: ${countriesApiUrl}`);
      return data.data;
    } else {
      console.error('Erreur réponse API countries:', data);
      return [];
    }
  } catch (error) {
    console.error('Error fetching countries from API:', error);
    // Fallback vers notre base de données locale en cas d'erreur
    try {
      const countries = await Country.find({}, { name: 1, cca2: 1, flags: 1 }).lean();
      console.log(`⚠️  Fallback: ${countries.length} pays récupérés depuis MongoDB`);
      return countries || [];
    } catch (dbError) {
      console.error('Error fallback database:', dbError);
      return [];
    }
  }
}

export class AIController {
  /**
   * Génère des suggestions de gig complètes basées sur une description
   */
  static async generateGigSuggestions(req: Request, res: Response) {
    try {
      const { description } = req.body;

      if (!description) {
        return res.status(400).json({ 
          error: 'Description is required' 
        });
      }

      // Récupérer les données réelles depuis l'API externe et notre base de données
      const [activitiesData, industriesData, languagesData, skillsData, timezonesData, countriesData] = await Promise.all([
        fetchActivities(),
        fetchIndustries(),
        fetchLanguages(),
        fetchSkills(),
        fetchTimezones(),
        fetchCountries()
      ]);

      const suggestions = await AIService.generateGigSuggestions(
        description,
        activitiesData,
        industriesData,
        languagesData,
        skillsData,
        timezonesData,
        countriesData
      );

      res.status(200).json(suggestions);
    } catch (error: any) {
      console.error('Error generating gig suggestions:', error);
      res.status(500).json({ 
        error: 'Failed to generate gig suggestions',
        message: error.message 
      });
    }
  }

  /**
   * Génère des compétences basées sur le titre et la description
   */
  static async generateSkills(req: Request, res: Response) {
    try {
      const { title, description } = req.body;

      if (!title) {
        return res.status(400).json({ 
          error: 'Title is required' 
        });
      }

      // Récupérer les données réelles depuis l'API externe
      const [languagesData, skillsData] = await Promise.all([
        fetchLanguages(),
        fetchSkills()
      ]);

      const skills = await AIService.generateSkills(
        title,
        description || '',
        skillsData,
        languagesData
      );

      res.status(200).json(skills);
    } catch (error: any) {
      console.error('Error generating skills:', error);
      res.status(500).json({ 
        error: 'Failed to generate skills',
        message: error.message 
      });
    }
  }

  /**
   * Génère des suggestions de fuseaux horaires
   */
  static async generateTimezones(req: Request, res: Response) {
    try {
      const request: TimezoneGenerationRequest = req.body;

      if (!request.targetMarkets || request.targetMarkets.length === 0) {
        return res.status(400).json({ 
          error: 'Target markets are required' 
        });
      }

      const timezoneResponse = await AIService.generateTimezones(request);

      res.status(200).json(timezoneResponse);
    } catch (error: any) {
      console.error('Error generating timezones:', error);
      res.status(500).json({ 
        error: 'Failed to generate timezone suggestions',
        message: error.message 
      });
    }
  }

  /**
   * Génère des suggestions de destinations (pays) pour un job
   */
  static async generateDestinations(req: Request, res: Response) {
    try {
      const { title, description, category } = req.body;

      if (!title) {
        return res.status(400).json({ 
          error: 'Title is required' 
        });
      }

      const destinations = await AIService.generateDestinations(
        title,
        description || '',
        category || ''
      );

      res.status(200).json(destinations);
    } catch (error: any) {
      console.error('Error generating destinations:', error);
      res.status(500).json({ 
        error: 'Failed to generate destination suggestions',
        message: error.message 
      });
    }
  }

  /**
   * Analyse un titre et génère une description améliorée
   */
  static async analyzeTitleAndGenerateDescription(req: Request, res: Response) {
    try {
      const { title } = req.body;

      if (!title) {
        return res.status(400).json({ 
          error: 'Title is required' 
        });
      }

      // Récupérer les données réelles depuis l'API externe et notre base de données
      const [activitiesData, industriesData, languagesData, skillsData, timezonesData, countriesData] = await Promise.all([
        fetchActivities(),
        fetchIndustries(),
        fetchLanguages(),
        fetchSkills(),
        fetchTimezones(),
        fetchCountries()
      ]);

      // Utiliser la fonction generateGigSuggestions avec juste le titre comme description
      const suggestions = await AIService.generateGigSuggestions(
        title,
        activitiesData,
        industriesData,
        languagesData,
        skillsData,
        timezonesData,
        countriesData
      );

      res.status(200).json(suggestions);
    } catch (error: any) {
      console.error('Error analyzing title:', error);
      res.status(500).json({ 
        error: 'Failed to analyze title and generate description',
        message: error.message 
      });
    }
  }

  /**
   * Endpoint de test qui utilise les vraies APIs mais sans OpenAI
   */
  static async testGigSuggestions(req: Request, res: Response) {
    try {
      const { description } = req.body;

      if (!description) {
        return res.status(400).json({ 
          error: 'Description is required' 
        });
      }

      // Récupérer les vraies données depuis l'API externe
      const [activitiesData, industriesData, languagesData, skillsData, timezonesData] = await Promise.all([
        fetchActivities(),
        fetchIndustries(),
        fetchLanguages(),
        fetchSkills(),
        fetchTimezones()
      ]);

      // Déterminer la catégorie basée sur la description
      const category = description.toLowerCase().includes('sales') ? 'Outbound Sales' :
                      description.toLowerCase().includes('support') ? 'Technical Support' :
                      description.toLowerCase().includes('service') ? 'Customer Service' :
                      'Customer Service'; // Default

      // Créer une réponse de test avec les vraies données et le schéma complet
      const testResponse = {
        jobTitles: [`${category} Specialist`, `${category} Agent`, `${category} Representative`],
        jobDescription: `Test description based on: ${description}`,
        category: category,
        destination_zone: timezonesData.find((tz: Timezone) => tz.zoneName === "Europe/Paris")?._id || 
                     timezonesData.find((tz: Timezone) => tz.zoneName === "UTC")?._id || "UTC",
        activities: activitiesData.slice(0, 3).map((activity: Activity) => activity._id),
        industries: industriesData.slice(0, 2).map((industry: Industry) => industry._id),
        seniority: {
          level: "Mid-Level",
          yearsExperience: 2
        },
        skills: {
          languages: languagesData.slice(0, 2).map((lang: Language) => ({
            language: lang._id,
            proficiency: "B2" as const,
            iso639_1: lang.code || 'en'
          })),
          soft: skillsData.soft.slice(0, 3).map((skill: Skill) => ({
            skill: skill._id,
            level: 3,
            details: skill.description
          })),
          professional: skillsData.professional.slice(0, 3).map((skill: Skill) => ({
            skill: skill._id,
            level: 3,
            details: skill.description
          })),
          technical: skillsData.technical.slice(0, 3).map((skill: Skill) => ({
            skill: skill._id,
            level: 3,
            details: skill.description
          }))
        },
        availability: {
          schedule: [
            {
              day: "Monday",
              hours: { start: "09:00", end: "17:00" }
            },
            {
              day: "Tuesday", 
              hours: { start: "09:00", end: "17:00" }
            },
            {
              day: "Wednesday",
              hours: { start: "09:00", end: "17:00" }
            },
            {
              day: "Thursday",
              hours: { start: "09:00", end: "17:00" }
            },
            {
              day: "Friday",
              hours: { start: "09:00", end: "17:00" }
            }
          ],
          time_zone: timezonesData.find((tz: Timezone) => tz.zoneName === "Europe/Paris")?._id || 
                     timezonesData.find((tz: Timezone) => tz.zoneName === "UTC")?._id || "UTC",
          flexibility: ["Flexible Hours", "Remote Work Available"],
          minimumHours: {
            daily: 4,
            weekly: 20,
            monthly: 80
          }
        },
        commission: {
          base: "Base + Commission",
          baseAmount: 0,
          bonus: "Performance Bonus",
          bonusAmount: 150,
          structure: "",
          currency: "EUR",
          minimumVolume: {
            amount: 25,
            period: "Monthly",
            unit: "Calls"
          },
          transactionCommission: {
            type: "Fixed Amount",
            amount: 50
          },
          additionalDetails: "Commission structure based on performance metrics and call quality. Additional bonuses available for exceeding monthly targets."
        },
        team: {
          size: 1,
          structure: [
            {
              roleId: "Agent",
              count: 1,
              seniority: {
                level: "Mid-Level",
                yearsExperience: 2
              }
            }
          ],
          territories: [countriesData.find((country: any) => country.name?.common === "France")?._id || "France"]
        },
        // Informations de debug
        debug: {
          activitiesCount: activitiesData.length,
          industriesCount: industriesData.length,
          languagesCount: languagesData.length,
          skillsCount: {
            soft: skillsData.soft.length,
            professional: skillsData.professional.length,
            technical: skillsData.technical.length
          }
        }
      };

      res.status(200).json(testResponse);
    } catch (error: any) {
      console.error('Error in test endpoint:', error);
      res.status(500).json({ 
        error: 'Failed to generate test suggestions',
        message: error.message 
      });
    }
  }

  /**
   * Endpoint pour tester la connexion aux APIs externes
   */
  static async testApiConnections(req: Request, res: Response) {
    try {
      const [activitiesData, industriesData, languagesData, skillsData, timezonesData] = await Promise.all([
        fetchActivities(),
        fetchIndustries(),
        fetchLanguages(),
        fetchSkills(),
        fetchTimezones()
      ]);

      const result = {
        success: true,
        message: "All API connections successful",
        data: {
          activities: {
            count: activitiesData.length,
            sample: activitiesData.slice(0, 3)
          },
          industries: {
            count: industriesData.length,
            sample: industriesData.slice(0, 3)
          },
          languages: {
            count: languagesData.length,
            sample: languagesData.slice(0, 3)
          },
          timezones: {
            count: timezonesData.length,
            sample: timezonesData.slice(0, 3)
          },
          skills: {
            soft: {
              count: skillsData.soft.length,
              sample: skillsData.soft.slice(0, 3)
            },
            professional: {
              count: skillsData.professional.length,
              sample: skillsData.professional.slice(0, 3)
            },
            technical: {
              count: skillsData.technical.length,
              sample: skillsData.technical.slice(0, 3)
            }
          }
        }
      };

      res.status(200).json(result);
    } catch (error: any) {
      console.error('Error testing API connections:', error);
      res.status(500).json({ 
        error: 'Failed to connect to external APIs',
        message: error.message 
      });
    }
  }

  /**
   * Endpoint pour tester le populate avec des IDs
   */
  static async testPopulateData(req: Request, res: Response) {
    try {
      // Exemple de données avec des IDs (comme celles retournées par OpenAI)
      const sampleGigWithIds = {
        title: "Sample Gig with IDs",
        description: "Testing populate functionality",
        activities: ["687cc65284bee31e62252106", "687cc65284bee31e62252107"], // IDs réels
        industries: ["687cc6372c780dc1639ce1a5", "687cc6372c780dc1639ce1a6"], // IDs réels
        skills: {
          languages: [
            { 
              language: "6878c3ba999b0fc08b1b14b5", // ID réel d'Abkhaz
              proficiency: "B2", 
              iso639_1: "ab" 
            }
          ],
          soft: [
            { 
              skill: "6868131dc44e8a46719af35c", // ID réel d'Adaptability
              level: 3, 
              details: "Important for customer service" 
            }
          ],
          professional: [
            { 
              skill: "68681321c44e8a46719af378", // ID réel de CRM System Proficiency
              level: 4, 
              details: "Essential for the role" 
            }
          ],
          technical: []
        }
      };

      // Test du populate
      const populatedData = await PopulateService.populateGigData(sampleGigWithIds, {
        activities: true,
        industries: true,
        languages: true,
        skills: true
      });

      res.status(200).json({
        success: true,
        message: "Populate test successful",
        original: sampleGigWithIds,
        populated: populatedData
      });
    } catch (error: any) {
      console.error('Error testing populate:', error);
      res.status(500).json({ 
        error: 'Failed to test populate functionality',
        message: error.message 
      });
    }
  }

  /**
   * Endpoint pour récupérer toutes les catégories prédéfinies
   */
  static async getCategories(req: Request, res: Response) {
    try {
      const categories = [
        'Inbound Sales', 'Outbound Sales', 'Customer Service', 'Technical Support', 
        'Account Management', 'Lead Generation', 'Market Research', 'Appointment Setting', 
        'Order Processing', 'Customer Retention', 'Billing Support', 'Product Support', 
        'Help Desk', 'Chat Support', 'Email Support', 'Social Media Support', 
        'Survey Calls', 'Welcome Calls', 'Follow-up Calls', 'Complaint Resolution', 
        'Warranty Support', 'Collections', 'Dispatch Services', 'Emergency Support', 
        'Multilingual Support'
      ];

      res.status(200).json({
        success: true,
        data: categories,
        message: "Categories retrieved successfully"
      });
    } catch (error: any) {
      console.error('Error getting categories:', error);
      res.status(500).json({ 
        error: 'Failed to get categories',
        message: error.message 
      });
    }
  }

  /**
   * Endpoint pour récupérer toutes les timezones
   */
  static async getTimezones(req: Request, res: Response) {
    try {
      const timezonesData = await fetchTimezones();

      res.status(200).json({
        success: true,
        data: timezonesData,
        message: "Timezones retrieved successfully"
      });
    } catch (error: any) {
      console.error('Error getting timezones:', error);
      res.status(500).json({ 
        error: 'Failed to get timezones',
        message: error.message 
      });
    }
  }
}
