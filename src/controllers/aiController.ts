import { Request, Response } from 'express';
import { Country } from '../models/countryModel';
import { Currency } from '../models/currencyModel';
import { Timezone } from '../models/timezoneModel';
import { AIService } from '../services/aiService';
import { PopulateService } from '../services/populateService';

// Configuration de l'API externe
const EXTERNAL_API_BASE = process.env.REP_URL || '/api';

// Fonctions pour récupérer les données depuis l'API externe
async function fetchActivities() {
  try {
    const response = await fetch(`${EXTERNAL_API_BASE}/activities`);
    const data = await response.json() as any;
    return data.success ? data.data : [];
  } catch (error) {
    console.error('Error fetching activities:', error);
    return [];
  }
}

async function fetchIndustries() {
  try {
    const response = await fetch(`${EXTERNAL_API_BASE}/industries`);
    const data = await response.json() as any;
    return data.success ? data.data : [];
  } catch (error) {
    console.error('Error fetching industries:', error);
    return [];
  }
}

async function fetchLanguages() {
  try {
    const response = await fetch(`${EXTERNAL_API_BASE}/languages`);
    const data = await response.json() as any;
    return data.success ? data.data : [];
  } catch (error) {
    console.error('Error fetching languages:', error);
    return [];
  }
}

async function fetchSkills() {
  try {
    const [softResponse, professionalResponse, technicalResponse] = await Promise.all([
      fetch(`${EXTERNAL_API_BASE}/skills/soft`),
      fetch(`${EXTERNAL_API_BASE}/skills/professional`),
      fetch(`${EXTERNAL_API_BASE}/skills/technical`)
    ]);

    const [softData, professionalData, technicalData] = await Promise.all([
      softResponse.json() as Promise<any>,
      professionalResponse.json() as Promise<any>,
      technicalResponse.json() as Promise<any>
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

async function fetchCurrencies() {
  try {
    console.log(`🔍 Reading currencies directly from MongoDB collection "currencies"`);

    const docs = await Currency.find({ isActive: true })
      .select({ code: 1, name: 1, symbol: 1, isActive: 1 })
      .lean();

    const currencies = docs.map((doc: any) => ({
      _id: String(doc._id),
      code: doc.code,
      name: doc.name,
      symbol: doc.symbol,
      isActive: doc.isActive,
    }));

    if (currencies.length > 0) {
      console.log(`✅ ${currencies.length} currencies loaded from MongoDB`);
      if (process.env.NODE_ENV !== 'production') {
        console.log('Sample currency:', JSON.stringify(currencies[0], null, 2));
      }
      return currencies;
    }

    console.warn('⚠️ Collection "currencies" is empty');
    throw new Error('Empty currency collection');
  } catch (error) {
    console.error('Error reading currencies from MongoDB:', error);
    console.log('⚠️ Using fallback currencies (EUR, USD, GBP)...');

    return [
      {
        "_id": "eur-id-placeholder",
        "code": "EUR",
        "name": "Euro",
        "symbol": "€",
        "isActive": true
      },
      {
        "_id": "usd-id-placeholder",
        "code": "USD",
        "name": "United States dollar",
        "symbol": "$",
        "isActive": true
      },
      {
        "_id": "gbp-id-placeholder",
        "code": "GBP",
        "name": "British pound",
        "symbol": "£",
        "isActive": true
      }
    ];
  }
}

async function fetchTimezones() {
  try {
    console.log(`🔍 Reading timezones directly from MongoDB collection "timezones"`);

    // NB: real documents in collection use `zoneName` + `countryCode` + `gmtOffset` + `countryName`
    // — older schema with `name` / `offset` is kept as alias fallback below.
    const docs = await Timezone.collection
      .find({}, {
        projection: {
          zoneName: 1,
          countryCode: 1,
          countryName: 1,
          gmtOffset: 1,
          name: 1,
          offset: 1,
          abbreviation: 1,
          description: 1,
        },
      })
      .toArray();

    const timezones = docs.map((doc: any) => ({
      _id: String(doc._id),
      zoneName: doc.zoneName || doc.name || '',
      name: doc.zoneName || doc.name || '',
      countryCode: doc.countryCode || '',
      countryName: doc.countryName || '',
      gmtOffset: doc.gmtOffset ?? null,
      offset: doc.offset || (typeof doc.gmtOffset === 'number'
        ? `${doc.gmtOffset >= 0 ? '+' : '-'}${String(Math.floor(Math.abs(doc.gmtOffset) / 3600)).padStart(2, '0')}:${String(Math.floor((Math.abs(doc.gmtOffset) % 3600) / 60)).padStart(2, '0')}`
        : ''),
      abbreviation: doc.abbreviation || '',
      description: doc.description || '',
    }));

    if (timezones.length > 0) {
      console.log(`✅ ${timezones.length} timezones loaded from MongoDB`);
      if (process.env.NODE_ENV !== 'production') {
        console.log('Sample timezone:', JSON.stringify(timezones[0], null, 2));
      }
      return timezones;
    }

    console.warn('⚠️ Collection "timezones" is empty');
    return [];
  } catch (error) {
    console.error('Error reading timezones from MongoDB:', error);
    return [];
  }
}

async function fetchCountries() {
  try {
    console.log(`🔍 Reading countries directly from MongoDB collection "countries"`);

    const docs = await Country.find({})
      .select({ name: 1, cca2: 1, flags: 1 })
      .lean();

    const countries = docs.map((doc: any) => ({
      _id: String(doc._id),
      name: doc.name,
      cca2: doc.cca2,
      flags: doc.flags || {},
    }));

    if (countries.length > 0) {
      console.log(`✅ ${countries.length} countries loaded from MongoDB`);
      if (process.env.NODE_ENV !== 'production') {
        console.log('Sample country:', JSON.stringify({ _id: countries[0]._id, name: countries[0].name, cca2: countries[0].cca2 }, null, 2));
      }
      return countries;
    }

    console.warn('⚠️ Collection "countries" is empty');
    return [];
  } catch (error) {
    console.error('Error reading countries from MongoDB:', error);
    return [];
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
      const [activitiesData, industriesData, languagesData, skillsData, timezonesData, countriesData, currenciesData] = await Promise.all([
        fetchActivities(),
        fetchIndustries(),
        fetchLanguages(),
        fetchSkills(),
        fetchTimezones(),
        fetchCountries(),
        fetchCurrencies()
      ]);

      const suggestions = await AIService.generateGigSuggestions(
        description,
        activitiesData,
        industriesData,
        languagesData,
        skillsData,
        timezonesData,
        countriesData,
        currenciesData
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
      const request = req.body;

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

      const destinations = await AIService.generateDestinations(title, description || '', category || '');

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
      const [activitiesData, industriesData, languagesData, skillsData, timezonesData, countriesData, currenciesData] = await Promise.all([
        fetchActivities(),
        fetchIndustries(),
        fetchLanguages(),
        fetchSkills(),
        fetchTimezones(),
        fetchCountries(),
        fetchCurrencies()
      ]);

      // Utiliser la fonction generateGigSuggestions avec juste le titre comme description
      const suggestions = await AIService.generateGigSuggestions(
        title,
        activitiesData,
        industriesData,
        languagesData,
        skillsData,
        timezonesData,
        countriesData,
        currenciesData
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
      const [activitiesData, industriesData, languagesData, skillsData, timezonesData, countriesData, currenciesData] = await Promise.all([
        fetchActivities(),
        fetchIndustries(),
        fetchLanguages(),
        fetchSkills(),
        fetchTimezones(),
        fetchCountries(),
        fetchCurrencies()
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
        destination_zone: timezonesData.find((tz: any) => tz.zoneName === "Europe/Paris")?._id ||
          timezonesData.find((tz: any) => tz.zoneName === "UTC")?._id || "UTC",
        activities: activitiesData.slice(0, 3).map((activity: any) => activity._id),
        industries: industriesData.slice(0, 2).map((industry: any) => industry._id),
        seniority: {
          level: "Mid-Level",
          yearsExperience: 2
        },
        skills: {
          languages: languagesData.slice(0, 2).map((lang: any) => ({
            language: lang._id,
            proficiency: "B2",
            iso639_1: lang.code || 'en'
          })),
          soft: skillsData.soft.slice(0, 3).map((skill: any) => ({
            skill: skill._id,
            level: 3,
            details: skill.description
          })),
          professional: skillsData.professional.slice(0, 3).map((skill: any) => ({
            skill: skill._id,
            level: 3,
            details: skill.description
          })),
          technical: skillsData.technical.slice(0, 3).map((skill: any) => ({
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
          time_zone: timezonesData.find((tz: any) => tz.zoneName === "Europe/Paris")?._id ||
            timezonesData.find((tz: any) => tz.zoneName === "UTC")?._id || "UTC",
          flexibility: ["Flexible Hours", "Remote Work Available"],
          minimumHours: {
            daily: 4,
            weekly: 20,
            monthly: 80
          }
        },
        commission: {
          commission_per_call: 0,
          bonusAmount: "150",
          currency: {
            $oid: currenciesData.find((c: any) => c.code === 'EUR')?._id ||
              currenciesData[0]?._id || "eur-id-placeholder"
          },
          minimumVolume: {
            amount: "25",
            period: "Monthly",
            unit: "Calls"
          },
          transactionCommission: 50, // Number
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
      const [activitiesData, industriesData, languagesData, skillsData, timezonesData, currenciesData] = await Promise.all([
        fetchActivities(),
        fetchIndustries(),
        fetchLanguages(),
        fetchSkills(),
        fetchTimezones(),
        fetchCurrencies()
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
          },
          currencies: {
            count: currenciesData.length,
            sample: currenciesData.slice(0, 3)
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

  /**
   * Endpoint pour tester la conversion des activités de noms vers IDs
   */
  static async testActivityMapping(req: Request, res: Response) {
    try {
      const { activities } = req.body;

      if (!activities || !Array.isArray(activities)) {
        return res.status(400).json({
          error: 'Activities array is required'
        });
      }

      // Récupérer les données réelles des activités
      const activitiesData = await fetchActivities();

      // Tester la conversion
      const testResults = activities.map((activityName: string) => {
        // Simuler la fonction findActivityId (on ne peut pas l'appeler directement car elle est private)

        // Recherche exacte d'abord
        let activity = activitiesData.find((a: any) => a.name.toLowerCase() === activityName.toLowerCase());
        let matchType = 'exact';
        let foundId = '';

        if (activity) {
          foundId = activity._id;
        } else {
          // Recherche approximative
          const normalizedSearchName = activityName.toLowerCase().trim();

          activity = activitiesData.find((a: any) => {
            const normalizedActivityName = a.name.toLowerCase().trim();
            return normalizedActivityName.includes(normalizedSearchName) ||
              normalizedSearchName.includes(normalizedActivityName);
          });

          if (activity) {
            foundId = activity._id;
            matchType = 'partial';
          } else {
            // Mapping manuel
            const manualMappings: { [key: string]: string } = {
              'lead generation': 'Lead Generation',
              'appointment setting': 'Appointment Setting',
              'prospection': 'Lead Generation',
              'prise de rendez-vous': 'Appointment Setting',
              'génération de leads': 'Lead Generation',
              'vente sortante': 'Outbound Sales',
              'vente entrante': 'Inbound Sales',
              'support client': 'Customer Service',
              'service client': 'Customer Service'
            };

            const mappedName = manualMappings[normalizedSearchName];
            if (mappedName) {
              activity = activitiesData.find((a: any) => a.name.toLowerCase() === mappedName.toLowerCase());
              if (activity) {
                foundId = activity._id;
                matchType = 'manual_mapping';
              }
            }

            if (!foundId && activitiesData.length > 0) {
              // Utiliser la première activité par défaut
              foundId = activitiesData[0]._id;
              activity = activitiesData[0];
              matchType = 'default_fallback';
            }
          }
        }

        return {
          input: activityName,
          output: foundId,
          matchedActivity: activity ? activity.name : 'Unknown',
          matchType: matchType,
          success: !!foundId && foundId !== 'unknown-activity-id'
        };
      });

      res.status(200).json({
        success: true,
        message: "Activity mapping test completed",
        results: testResults,
        summary: {
          total: testResults.length,
          successful: testResults.filter((r: any) => r.success).length,
          failed: testResults.filter((r: any) => !r.success).length,
          matchTypes: {
            exact: testResults.filter((r: any) => r.matchType === 'exact').length,
            partial: testResults.filter((r: any) => r.matchType === 'partial').length,
            manual_mapping: testResults.filter((r: any) => r.matchType === 'manual_mapping').length,
            default_fallback: testResults.filter((r: any) => r.matchType === 'default_fallback').length
          }
        },
        availableActivities: activitiesData.map((a: any) => ({ id: a._id, name: a.name }))
      });
    } catch (error: any) {
      console.error('Error testing activity mapping:', error);
      res.status(500).json({
        error: 'Failed to test activity mapping',
        message: error.message
      });
    }
  }

}
