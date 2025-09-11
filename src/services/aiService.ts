import OpenAI from 'openai';

// Configuration sécurisée d'OpenAI côté backend
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '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',
});

export interface GigSuggestion {
  title: string;
  description: string;
  category: string;
  activities: string[];
  industries: string[];
  highlights: string[];
  deliverables: string[];
  schedule?: {
    schedules: Array<{
      timezone: string;
      days: string[];
      hours: {
        start: string;
        end: string;
      };
    }>;
  };
  skills?: {
    languages: Array<{
      language: string;
      proficiency: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
      iso639_1: string;
    }>;
    soft: Array<{ skill: { $oid: string }; level: number; details: string }>;
    professional: Array<{ skill: { $oid: string }; level: number; details: string }>;
    technical: Array<{ skill: { $oid: string }; level: number; details: string }>;
  };
}

export interface TimezoneGenerationRequest {
  targetMarkets: string[];
  businessHours?: string;
  teamDistribution?: string;
  coverageRequirements?: string;
}

export interface TimezoneGenerationResponse {
  suggestedTimezones: string[];
  workingHours: {
    start: string;
    end: string;
  };
  coverageAnalysis: string;
  flexibilityRecommendations: string[];
}

// Rate limiting configuration
const RETRY_DELAY = 1000;
const MAX_RETRIES = 3;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function retryWithBackoff(fn: () => Promise<any>, retries = MAX_RETRIES): Promise<any> {
  try {
    return await fn();
  } catch (error: any) {
    if (error?.error?.code === 'rate_limit_exceeded' && retries > 0) {
      const delay = RETRY_DELAY * (MAX_RETRIES - retries + 1);
      await sleep(delay);
      return retryWithBackoff(fn, retries - 1);
    }
    throw error;
  }
}

// Liste des catégories prédéfinies
const PREDEFINED_CATEGORIES = [
  'Inbound Sales', 'Outbound Sales', 'Customer Service', 'Technical Support', 
  'Account Management', 'Lead Generation', 'Market Research', 'Appointment Setting', 
  'Order Processing', 'Customer Retention', 'Billing Support', 'Product Support', 
  'Help Desk', 'Chat Support', 'Email Support', 'Social Media Support', 
  'Survey Calls', 'Welcome Calls', 'Follow-up Calls', 'Complaint Resolution', 
  'Warranty Support', 'Collections', 'Dispatch Services', 'Emergency Support', 
  'Multilingual Support'
];

export class AIService {
  private static isValidApiKey(): boolean {
    const key = process.env.OPENAI_API_KEY;
    return !!(key && key !== 'your_openai_api_key_here' && key.startsWith('sk-'));
  }

  /**
   * Trouve la catégorie la plus appropriée parmi les catégories prédéfinies
   */
  private static findBestCategory(suggestedCategory: string): string {
    if (!suggestedCategory) return 'Customer Service'; // Default

    // Recherche exacte
    const exactMatch = PREDEFINED_CATEGORIES.find(cat => 
      cat.toLowerCase() === suggestedCategory.toLowerCase()
    );
    if (exactMatch) return exactMatch;

    // Recherche par mots-clés
    const lowerSuggested = suggestedCategory.toLowerCase();
    
    // Mapping des mots-clés vers les catégories
    const categoryMapping: { [key: string]: string } = {
      'sales': 'Outbound Sales',
      'sell': 'Outbound Sales',
      'selling': 'Outbound Sales',
      'customer': 'Customer Service',
      'support': 'Customer Service',
      'service': 'Customer Service',
      'tech': 'Technical Support',
      'technical': 'Technical Support',
      'help': 'Help Desk',
      'chat': 'Chat Support',
      'email': 'Email Support',
      'phone': 'Inbound Sales',
      'call': 'Inbound Sales',
      'lead': 'Lead Generation',
      'research': 'Market Research',
      'appointment': 'Appointment Setting',
      'order': 'Order Processing',
      'billing': 'Billing Support',
      'retention': 'Customer Retention',
      'account': 'Account Management',
      'social': 'Social Media Support',
      'survey': 'Survey Calls',
      'complaint': 'Complaint Resolution',
      'collection': 'Collections',
      'emergency': 'Emergency Support',
      'multilingual': 'Multilingual Support'
    };

    // Recherche par mots-clés
    for (const [keyword, category] of Object.entries(categoryMapping)) {
      if (lowerSuggested.includes(keyword)) {
        return category;
      }
    }

    // Fallback par similarité partielle
    const partialMatch = PREDEFINED_CATEGORIES.find(cat => 
      cat.toLowerCase().includes(lowerSuggested) || 
      lowerSuggested.includes(cat.toLowerCase())
    );
    if (partialMatch) return partialMatch;

    // Default fallback
    return 'Customer Service';
  }

  /**
   * Génère des suggestions de gig basées sur une description
   */
  static async generateGigSuggestions(
    description: string,
    activitiesData: any[],
    industriesData: any[],
    languagesData: any[],
    skillsData: { soft: any[], professional: any[], technical: any[] },
    timezonesData?: any[]
  ): Promise<GigSuggestion> {
    if (!this.isValidApiKey()) {
      throw new Error('OpenAI API key not configured properly');
    }

    if (!description) {
      throw new Error('Description is required');
    }

    // Créer les listes pour le prompt OpenAI
    const activityNames = activitiesData.map(activity => activity.name);
    const industryNames = industriesData.map(industry => industry.name);
    const languageNames = languagesData.map(lang => lang.name);
    const softSkillNames = skillsData.soft.map(skill => skill.name);
    const professionalSkillNames = skillsData.professional.map(skill => skill.name);
    const technicalSkillNames = skillsData.technical.map(skill => skill.name);

    const prompt = `Based on this gig description: "${description}"

Please analyze and provide suggestions for a comprehensive gig listing. 

FIRST: DETECT THE LANGUAGE of the user's job description. 
- If it's in French, respond in French
- If it's in English, respond in English  
- If it's in Arabic, respond in Arabic
- If it's in Spanish, respond in Spanish
- If it's in German, respond in German
- If it's in Italian, respond in Italian
- If it's in Portuguese, respond in Portuguese
- If it's in Dutch, respond in Dutch
- If it's in Russian, respond in Russian
- If it's in Chinese, respond in Chinese
- If it's in Japanese, respond in Japanese
- If it's ANY OTHER language, respond in that exact same language
This applies to ALL TEXT FIELDS: jobTitles, jobDescription, and additionalDetails.

EXTREMELY IMPORTANT: The jobTitles array MUST be in the same language as the user query. 
Example: Arabic query → Arabic jobTitles: ["وكيل مبيعات التأمين الصحي", "أخصائي التأمين الصحي"]

Use ONLY the options provided below:

CATEGORIES (choose the most appropriate one):
${PREDEFINED_CATEGORIES.join(', ')}

ACTIVITIES (choose the most relevant ones):
${activityNames.join(', ')}

INDUSTRIES (choose the most relevant ones):
${industriesData.map(ind => `${ind.name} (${ind.code})`).join(', ')}

LANGUAGES (suggest relevant ones with proficiency levels A1-C2):
${languagesData.map(lang => `${lang.name} (${lang.iso639_1})`).join(', ')}

SOFT SKILLS (choose relevant ones with levels 1-5):
${softSkillNames.join(', ')}

PROFESSIONAL SKILLS (choose relevant ones with levels 1-5):
${professionalSkillNames.join(', ')}

TECHNICAL SKILLS (choose relevant ones with levels 1-5):
${technicalSkillNames.join(', ')}

IMPORTANT INSTRUCTIONS:

CRITICAL LANGUAGE ADAPTATION (MUST FOLLOW):
- If user query contains French text → ALWAYS respond in French for title, description, additionalDetails
- If user query contains English text → ALWAYS respond in English for title, description, additionalDetails  
- If user query contains Arabic text → ALWAYS respond in Arabic for title, description, additionalDetails
- If user query contains Spanish text → ALWAYS respond in Spanish for title, description, additionalDetails
- If user query contains German text → ALWAYS respond in German for title, description, additionalDetails
- If user query contains ANY OTHER language → ALWAYS respond in that exact same language for title, description, additionalDetails
- DETECT the language from the job description content, not just keywords
- Examples:
  * French: "Rejoins notre équipe" → "Rejoignez notre équipe"
  * English: "Join our team" → "Join our team"
  * Arabic: "انضم إلى فريقنا" → "انضموا إلى فريقنا"
  * Spanish: "Únete a nuestro equipo" → "Únase a nuestro equipo"

- jobTitles Examples:
  * Arabic query → jobTitles: ["وكيل مبيعات التأمين الصحي", "أخصائي مبيعات التأمين", "مستشار التأمين"]
  * French query → jobTitles: ["Agent Commercial Assurance", "Spécialiste Vente", "Conseiller Assurance"]
  * English query → jobTitles: ["Insurance Sales Agent", "Sales Specialist", "Insurance Advisor"]

For availability.schedule:
- NEVER use "Other days" - always specify individual days
- Each day must be separate: "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
- Create individual schedule entries for each day mentioned

For timezone (availability.time_zone), follow this priority order:
1. FIRST: If user explicitly mentions a country/timezone (e.g., "Ethiopia", "time zone de ethiopia") → use that specific timezone (e.g., Africa/Addis_Ababa)
2. SECOND: Analyze job context for company indicators:
   - French companies (APRIL, SPVIE, ALPTIS, etc.) → Europe/Paris
   - UK companies → Europe/London  
   - US companies → America/New_York or America/Los_Angeles
3. THIRD: If unclear, use Europe/Paris as default

For destination_zone: Use the same timezone as availability.time_zone

For seniority.level: Choose from "Entry Level", "Junior", "Mid-Level", "Senior", "Team Lead", "Supervisor", "Manager", "Director"

For commission: All amounts must be numbers (not strings), currency depends on destination_zone
- base must ALWAYS be "Base + Commission" (fixed value)
- bonus must ALWAYS be "Performance Bonus" (fixed value)
- transactionCommission.type must ALWAYS be "Fixed Amount" (fixed value)
- minimumVolume.period must be "Monthly", "Weekly", or "Daily"
- minimumVolume.unit must be "Per Call" or "Per Transaction"
- additionalDetails: Provide detailed compensation information, performance bonuses, and payment conditions extracted from job description

For team.structure.roleId: Choose from "Team Lead", "Senior Agent", "Agent", "Junior Agent", "Supervisor", "Manager", "Coordinator", "Specialist", "Consultant", "Representative", "Associate", "Assistant", "Trainee", "Intern"

For availability.schedule: Create realistic work schedules based on job description

For availability.flexibility: Choose from "Remote Work Available", "Flexible Hours", "Weekend Rotation", "Night Shift Available", "Split Shifts", "Part-Time Options", "Compressed Work Week", "Shift Swapping Allowed"

For commission: Extract salary/commission info from description or use defaults

For team.territories: List relevant countries/regions for the role (will be converted to timezone IDs)

For jobTitles: Provide 2-4 different job title suggestions as an array, from most specific to more general
- CRITICAL: jobTitles MUST be in the SAME LANGUAGE as the user query
- If query is in Arabic → jobTitles in Arabic
- If query is in French → jobTitles in French
- If query is in English → jobTitles in English
- If query is in any other language → jobTitles in that exact same language

For jobDescription: Provide a single enhanced description as a string (same language as user query)

For highlights: Provide an array of 3-5 key selling points or attractive aspects of the role (same language as user query)

For deliverables: Provide an array of 3-5 specific outcomes, results, or deliverables expected from this role (same language as user query)

Provide a response in this exact JSON format (CRITICAL: ALWAYS use the EXACT SAME LANGUAGE as the user query - French→French, Arabic→Arabic, Spanish→Spanish, etc.):
{
  "jobTitles": ["Main job title suggestion (SAME LANGUAGE AS USER QUERY)", "Alternative job title (SAME LANGUAGE AS USER QUERY)", "Another option (SAME LANGUAGE AS USER QUERY)"],
  "jobDescription": "Enhanced description (IN SAME LANGUAGE AS USER QUERY)",
  "highlights": ["Key selling point 1 (SAME LANGUAGE AS USER QUERY)", "Key selling point 2 (SAME LANGUAGE AS USER QUERY)", "Key selling point 3 (SAME LANGUAGE AS USER QUERY)"],
  "deliverables": ["Expected outcome 1 (SAME LANGUAGE AS USER QUERY)", "Expected outcome 2 (SAME LANGUAGE AS USER QUERY)", "Expected outcome 3 (SAME LANGUAGE AS USER QUERY)"],
  "category": "One of the predefined categories above",
  "destination_zone": "Europe/Paris",
  "activities": ["activity1", "activity2"],
  "industries": ["industry1", "industry2"],
  "seniority": {
    "level": "Mid-Level",
    "yearsExperience": 2
  },
  "skills": {
    "languages": [{"language": "English", "proficiency": "C1", "iso639_1": "en"}],
    "soft": [{"skill": "skillName", "level": 4, "details": "Brief explanation"}],
    "professional": [{"skill": "skillName", "level": 3, "details": "Brief explanation"}],
    "technical": [{"skill": "skillName", "level": 4, "details": "Brief explanation"}]
  },
  "availability": {
    "schedule": [
      {
        "day": "Monday",
        "hours": {"start": "09:00", "end": "17:00"}
      },
      {
        "day": "Tuesday", 
        "hours": {"start": "09:00", "end": "17:00"}
      },
      {
        "day": "Wednesday",
        "hours": {"start": "09:00", "end": "17:00"}
      },
      {
        "day": "Thursday",
        "hours": {"start": "09:00", "end": "17:00"}
      },
      {
        "day": "Friday",
        "hours": {"start": "09:00", "end": "17:00"}
      }
    ],
    "time_zone": "Europe/Paris",
    "flexibility": ["Flexible Hours", "Remote Work Available"],
    "minimumHours": {
      "daily": 4,
      "weekly": 20,
      "monthly": 80
    }
  },
  "commission": {
    "base": "Base + Commission",
    "baseAmount": 0,
    "bonus": "Performance Bonus",
    "bonusAmount": 150,
    "structure": "",
    "currency": "EUR",
    "minimumVolume": {
      "amount": 25,
      "period": "Monthly",
      "unit": "Per Call"
    },
    "transactionCommission": {
      "type": "Fixed Amount",
      "amount": 50
    },
    "additionalDetails": "Detailed compensation information and performance bonuses (IN SAME LANGUAGE AS USER QUERY)"
  },
  "team": {
    "size": 1,
    "structure": [
      {
        "roleId": "Agent",
        "count": 1,
        "seniority": {
          "level": "Mid-Level",
          "yearsExperience": 2
        }
      }
    ],
    "territories": ["Morocco"]
  }
}`;

    return retryWithBackoff(async () => {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that creates comprehensive gig listings. IMPORTANT: All responses MUST be in English only. Return only valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      try {
        const parsedResponse = this.parseOpenAIResponse(content);
        
        // Convertir les noms en IDs pour maintenir les références
        
        // Valider et corriger la catégorie
        if (parsedResponse.category) {
          parsedResponse.category = this.findBestCategory(parsedResponse.category);
        } else {
          parsedResponse.category = 'Customer Service'; // Default
        }
        
        // Convertir les activités en IDs
        if (parsedResponse.activities) {
          parsedResponse.activities = parsedResponse.activities.map((activityName: string) => 
            this.findActivityId(activityName, activitiesData)
          );
        }

        // Convertir les industries en IDs
        if (parsedResponse.industries) {
          parsedResponse.industries = parsedResponse.industries.map((industryName: string) => 
            this.findIndustryId(industryName, industriesData)
          );
        }

        // Convertir les langues en IDs
        if (parsedResponse.skills?.languages) {
          parsedResponse.skills.languages = parsedResponse.skills.languages.map((lang: any) => ({
            language: this.findLanguageId(lang.language, languagesData),
            proficiency: lang.proficiency,
            iso639_1: lang.iso639_1
          }));
        }

        // Convertir les noms de skills en IDs
        if (parsedResponse.skills) {
          if (parsedResponse.skills.soft) {
            parsedResponse.skills.soft = parsedResponse.skills.soft.map((s: any) => ({
              skill: this.findSkillId(s.skill, skillsData.soft),
              level: s.level,
              details: s.details
            }));
          }
          if (parsedResponse.skills.professional) {
            parsedResponse.skills.professional = parsedResponse.skills.professional.map((s: any) => ({
              skill: this.findSkillId(s.skill, skillsData.professional),
              level: s.level,
              details: s.details
            }));
          }
          if (parsedResponse.skills.technical) {
            parsedResponse.skills.technical = parsedResponse.skills.technical.map((s: any) => ({
              skill: this.findSkillId(s.skill, skillsData.technical),
              level: s.level,
              details: s.details
            }));
          }
        }

        // Convertir les timezones en IDs avec contexte intelligent
        const fullContext = `${parsedResponse.title || ''} ${parsedResponse.description || ''} ${description}`;
        
        // Gérer l'ancien format (schedule.schedules) pour rétrocompatibilité
        if (parsedResponse.schedule?.schedules && timezonesData) {
          parsedResponse.schedule.schedules = parsedResponse.schedule.schedules.map((schedule: any) => ({
            ...schedule,
            timezone: this.findTimezoneId(schedule.timezone || 'UTC', timezonesData, fullContext)
          }));
        }

        // Gérer le nouveau format (availability.time_zone)
        if (parsedResponse.availability?.time_zone && timezonesData) {
          const originalTimezoneName = parsedResponse.availability.time_zone;
          const timezoneId = this.findTimezoneId(
            originalTimezoneName, 
            timezonesData, 
            fullContext
          );
          parsedResponse.availability.time_zone = timezoneId;
          
          // destination_zone utilise le même ID de timezone
          if (parsedResponse.destination_zone) {
            parsedResponse.destination_zone = timezoneId;
          }
          
          // Mettre à jour la currency basée sur la timezone
          if (parsedResponse.commission) {
            parsedResponse.commission.currency = this.getCurrencyFromTimezone(originalTimezoneName);
          }
        }

        // Si pas d'availability.time_zone mais destination_zone existe, la convertir aussi
        if (parsedResponse.destination_zone && timezonesData && !parsedResponse.availability?.time_zone) {
          parsedResponse.destination_zone = this.findTimezoneId(
            parsedResponse.destination_zone, 
            timezonesData, 
            fullContext
          );
        }

        // Convertir les territories en IDs
        if (parsedResponse.team?.territories && timezonesData) {
          parsedResponse.team.territories = parsedResponse.team.territories.map((territory: string) => 
            this.findTerritoryId(territory, timezonesData)
          );
        }

        // Convertir les timeZones dans le schedule principal (rétrocompatibilité)
        if (parsedResponse.schedule?.timeZones && timezonesData) {
          parsedResponse.schedule.timeZones = parsedResponse.schedule.timeZones.map((tz: string) => 
            this.findTimezoneId(tz, timezonesData, fullContext)
          );
        }

        return parsedResponse;
      } catch (error) {
        console.error('Error parsing OpenAI response:', error);
        console.error('Raw response:', content);
        throw new Error('Invalid response format from OpenAI');
      }
    });
  }

  /**
   * Génère des compétences basées sur le titre et la description
   */
  static async generateSkills(
    title: string, 
    description: string,
    skillsData: { soft: any[], professional: any[], technical: any[] },
    languagesData: any[]
  ): Promise<{
    languages: Array<{
      language: string;
      proficiency: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
      iso639_1: string;
    }>;
    soft: Array<{ skill: { $oid: string }; level: number; details: string }>;
    professional: Array<{ skill: { $oid: string }; level: number; details: string }>;
    technical: Array<{ skill: { $oid: string }; level: number; details: string }>;
  }> {
    if (!this.isValidApiKey()) {
      throw new Error('OpenAI API key not configured properly');
    }

    const softSkillNames = skillsData.soft.map(skill => skill.name);
    const professionalSkillNames = skillsData.professional.map(skill => skill.name);
    const technicalSkillNames = skillsData.technical.map(skill => skill.name);

    const prompt = `Based on this job: "${title}" - ${description}

Suggest relevant skills from the following lists:

SOFT SKILLS: ${softSkillNames.join(', ')}
PROFESSIONAL SKILLS: ${professionalSkillNames.join(', ')}
TECHNICAL SKILLS: ${technicalSkillNames.join(', ')}
LANGUAGES: ${languagesData.map(lang => `${lang.name} (${lang.iso639_1})`).join(', ')}

Return JSON in this exact format:
{
  "languages": [{"language": "English", "proficiency": "C1", "iso639_1": "en"}],
  "soft": [{"skill": "skillName", "level": 4, "details": "Why this skill is relevant"}],
  "professional": [{"skill": "skillName", "level": 3, "details": "Why this skill is relevant"}],
  "technical": [{"skill": "skillName", "level": 4, "details": "Why this skill is relevant"}]
}`;

    return retryWithBackoff(async () => {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that suggests relevant skills for job positions. IMPORTANT: All responses MUST be in English only. Return only valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      try {
        const parsedResponse = this.parseOpenAIResponse(content);
        
        // Convertir les langues en IDs
        if (parsedResponse.languages) {
          parsedResponse.languages = parsedResponse.languages.map((lang: any) => ({
            language: this.findLanguageId(lang.language, languagesData),
            proficiency: lang.proficiency,
            iso639_1: lang.iso639_1
          }));
        }

        // Convertir les noms de skills en IDs
        if (parsedResponse.soft) {
          parsedResponse.soft = parsedResponse.soft.map((s: any) => ({
            skill: this.findSkillId(s.skill, skillsData.soft),
            level: s.level,
            details: s.details
          }));
        }
        if (parsedResponse.professional) {
          parsedResponse.professional = parsedResponse.professional.map((s: any) => ({
            skill: this.findSkillId(s.skill, skillsData.professional),
            level: s.level,
            details: s.details
          }));
        }
        if (parsedResponse.technical) {
          parsedResponse.technical = parsedResponse.technical.map((s: any) => ({
            skill: this.findSkillId(s.skill, skillsData.technical),
            level: s.level,
            details: s.details
          }));
        }

        return parsedResponse;
      } catch (error) {
        console.error('Error parsing OpenAI response:', error);
        console.error('Raw response:', content);
        throw new Error('Invalid response format from OpenAI');
      }
    });
  }

  /**
   * Génère des suggestions de fuseaux horaires
   */
  static async generateTimezones(request: TimezoneGenerationRequest): Promise<TimezoneGenerationResponse> {
    if (!this.isValidApiKey()) {
      throw new Error('OpenAI API key not configured properly');
    }

    const prompt = `Based on the following business requirements, suggest optimal time zones and working hours:

Target markets: ${request.targetMarkets.join(', ')}
Business hours: ${request.businessHours || 'Not specified'}
Team distribution: ${request.teamDistribution || 'Not specified'}
Coverage requirements: ${request.coverageRequirements || 'Not specified'}

Please provide:
1. A list of primary time zones for operations (use IANA timezone names)
2. Suggested working hours (in 24-hour format)
3. Schedule flexibility recommendations
4. Coverage analysis and gaps

Format your response as a JSON object with the following structure:
{
  "suggestedTimezones": ["New York (EST/EDT)", "London (GMT/BST)", ...],
  "workingHours": {
    "start": "09:00",
    "end": "17:00"
  },
  "coverageAnalysis": "Brief analysis of coverage...",
  "flexibilityRecommendations": ["Recommendation 1", "Recommendation 2", ...]
}`;

    return retryWithBackoff(async () => {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that provides timezone and scheduling recommendations for global business operations. IMPORTANT: All responses MUST be in English only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      try {
        return this.parseOpenAIResponse(content);
      } catch (error) {
        console.error('Error parsing OpenAI response:', error);
        console.error('Raw response:', content);
        throw new Error('Invalid response format from OpenAI');
      }
    });
  }

  /**
   * Génère des suggestions de destinations (pays) pour un job
   */
  static async generateDestinations(title: string, description: string, category: string): Promise<string[]> {
    if (!this.isValidApiKey()) {
      throw new Error('OpenAI API key not configured properly');
    }

    const prompt = `Based on the following job information, suggest the most appropriate destination zones (countries or regions) for this position. Consider factors like market demand, talent availability, and business needs. Return only the country codes in a JSON array format.

Job Title: ${title}
Category: ${category}
Description: ${description}

Example response format: ["US", "CA", "UK", "DE"]`;

    return retryWithBackoff(async () => {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that suggests appropriate destination zones for job postings based on the job details provided. IMPORTANT: All responses MUST be in English only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 100,
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      try {
        return this.parseOpenAIResponse(content);
      } catch (error) {
        console.error('Error parsing OpenAI response:', error);
        console.error('Raw response:', content);
        throw new Error('Invalid response format from OpenAI');
      }
    });
  }

  /**
   * Trouve l'ID d'une compétence par son nom
   */
  private static findSkillId(skillName: string, skillsList: any[]): string {
    const skill = skillsList.find(s => 
      s.name.toLowerCase() === skillName.toLowerCase()
    );
    return skill ? skill._id : skillName; // Fallback au nom si ID non trouvé
  }

  /**
   * Trouve l'ID d'une activité par son nom
   */
  private static findActivityId(activityName: string, activitiesList: any[]): string {
    const activity = activitiesList.find(a => 
      a.name.toLowerCase() === activityName.toLowerCase()
    );
    return activity ? activity._id : activityName;
  }

  /**
   * Trouve l'ID d'une industrie par son nom
   */
  private static findIndustryId(industryName: string, industriesList: any[]): string {
    const industry = industriesList.find(i => 
      i.name.toLowerCase() === industryName.toLowerCase()
    );
    return industry ? industry._id : industryName;
  }

  /**
   * Trouve l'ID d'une langue par son nom
   */
  private static findLanguageId(languageName: string, languagesList: any[]): string {
    const language = languagesList.find(l => 
      l.name.toLowerCase() === languageName.toLowerCase()
    );
    return language ? language._id : languageName;
  }

  /**
   * Trouve l'ID d'un territoire/pays par son nom
   */
  private static findTerritoryId(territoryName: string, timezonesList: any[]): string {
    if (!timezonesList || timezonesList.length === 0) return territoryName;
    
    // Recherche par nom de pays exact
    let territory = timezonesList.find(tz => 
      tz.countryName?.toLowerCase() === territoryName.toLowerCase()
    );
    
    if (territory) return territory._id;
    
    // Recherche partielle par nom de pays
    territory = timezonesList.find(tz => 
      tz.countryName?.toLowerCase().includes(territoryName.toLowerCase())
    );
    
    if (territory) return territory._id;
    
    // Mapping des noms de pays courants
    const countryMapping: { [key: string]: string } = {
      'france': 'France',
      'morocco': 'Morocco',
      'maroc': 'Morocco',
      'tunisia': 'Tunisia',
      'tunisie': 'Tunisia',
      'algeria': 'Algeria',
      'algérie': 'Algeria',
      'egypt': 'Egypt',
      'egypte': 'Egypt',
      'ethiopia': 'Ethiopia',
      'éthiopie': 'Ethiopia',
      'kenya': 'Kenya',
      'nigeria': 'Nigeria',
      'ghana': 'Ghana',
      'senegal': 'Senegal',
      'sénégal': 'Senegal',
      'south africa': 'South Africa',
      'afrique du sud': 'South Africa',
      'usa': 'United States',
      'united states': 'United States',
      'états-unis': 'United States',
      'uk': 'United Kingdom',
      'united kingdom': 'United Kingdom',
      'royaume-uni': 'United Kingdom',
      'canada': 'Canada',
      'germany': 'Germany',
      'allemagne': 'Germany',
      'spain': 'Spain',
      'espagne': 'Spain',
      'italy': 'Italy',
      'italie': 'Italy',
      'india': 'India',
      'inde': 'India',
      'china': 'China',
      'chine': 'China',
      'japan': 'Japan',
      'japon': 'Japan',
      'australia': 'Australia',
      'australie': 'Australia',
      'brazil': 'Brazil',
      'brésil': 'Brazil',
      'mexico': 'Mexico',
      'mexique': 'Mexico'
    };
    
    const mappedCountry = countryMapping[territoryName.toLowerCase()];
    if (mappedCountry) {
      territory = timezonesList.find(tz => tz.countryName === mappedCountry);
      if (territory) return territory._id;
    }
    
    // Fallback: retourner le nom original si pas trouvé
    return territoryName;
  }

  /**
   * Trouve l'ID d'une timezone par son nom avec contexte intelligent
   */
  private static findTimezoneId(timezoneName: string, timezonesList: any[], context?: string): string {
    if (!timezonesList || timezonesList.length === 0) return timezoneName;
    
    // Recherche exacte par zoneName
    let timezone = timezonesList.find(tz => 
      tz.zoneName === timezoneName
    );
    
    if (timezone) return timezone._id;
    
    // Analyse contextuelle pour déterminer la région probable
    const contextualMapping = this.getContextualTimezone(context || '', timezonesList);
    if (contextualMapping) return contextualMapping;
    
    // Recherche par nom de pays ou zone
    timezone = timezonesList.find(tz => 
      tz.countryName?.toLowerCase().includes(timezoneName.toLowerCase()) ||
      tz.zoneName?.toLowerCase().includes(timezoneName.toLowerCase())
    );
    
    if (timezone) return timezone._id;
    
    // Mapping des timezones communes
    const timezoneMapping: { [key: string]: string } = {
      'UTC': 'UTC',
      'GMT': 'Europe/London',
      'EST': 'America/New_York',
      'PST': 'America/Los_Angeles',
      'CET': 'Europe/Paris',
      'CEST': 'Europe/Paris',
      'JST': 'Asia/Tokyo'
    };
    
    const mappedZone = timezoneMapping[timezoneName.toUpperCase()];
    if (mappedZone) {
      timezone = timezonesList.find(tz => tz.zoneName === mappedZone);
      if (timezone) return timezone._id;
    }
    
    // Fallback intelligent basé sur le contexte
    timezone = timezonesList.find(tz => tz.zoneName === 'Europe/Paris') ||  // France par défaut
               timezonesList.find(tz => tz.zoneName === 'UTC') || 
               timezonesList.find(tz => tz.zoneName.includes('UTC')) ||
               timezonesList[0];
    
    return timezone ? timezone._id : timezoneName;
  }

  /**
   * Parse robuste du JSON OpenAI qui peut contenir du texte explicatif
   */
  private static parseOpenAIResponse(content: string): any {
    try {
      // Essayer d'abord un parse direct
      return JSON.parse(content);
    } catch (error) {
      console.log('Direct JSON parse failed, trying extraction...');
      
      // Extraire le JSON de la réponse (supprimer le texte explicatif)
      let jsonContent = content;
      
      // Si la réponse contient des blocs de code markdown, les extraire
      const codeBlockMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (codeBlockMatch) {
        jsonContent = codeBlockMatch[1];
        console.log('Found JSON in markdown block');
      } else {
        // Chercher le début et la fin du JSON
        const jsonStart = content.indexOf('{');
        const jsonEnd = content.lastIndexOf('}') + 1;
        
        if (jsonStart !== -1 && jsonEnd > jsonStart) {
          jsonContent = content.substring(jsonStart, jsonEnd);
          console.log('Extracted JSON from position', jsonStart, 'to', jsonEnd);
        }
      }
      
      console.log('Attempting to parse extracted content:', jsonContent.substring(0, 200) + '...');
      return JSON.parse(jsonContent);
    }
  }

  /**
   * Détermine la devise basée sur la timezone/destination
   */
  private static getCurrencyFromTimezone(timezoneName: string): string {
    const currencyMapping: { [key: string]: string } = {
      // Europe
      'Europe/Paris': 'EUR',
      'Europe/London': 'GBP',
      'Europe/Berlin': 'EUR',
      'Europe/Madrid': 'EUR',
      'Europe/Rome': 'EUR',
      'Europe/Amsterdam': 'EUR',
      'Europe/Brussels': 'EUR',
      'Europe/Vienna': 'EUR',
      'Europe/Zurich': 'CHF',
      
      // Amérique du Nord
      'America/New_York': 'USD',
      'America/Los_Angeles': 'USD',
      'America/Chicago': 'USD',
      'America/Toronto': 'CAD',
      'America/Vancouver': 'CAD',
      
      // Afrique
      'Africa/Addis_Ababa': 'ETB',
      'Africa/Casablanca': 'MAD',
      'Africa/Tunis': 'TND',
      'Africa/Algiers': 'DZD',
      'Africa/Cairo': 'EGP',
      'Africa/Johannesburg': 'ZAR',
      'Africa/Nairobi': 'KES',
      'Africa/Lagos': 'NGN',
      'Africa/Accra': 'GHS',
      'Africa/Dakar': 'XOF',
      'Africa/Abidjan': 'XOF',
      
      // Asie
      'Asia/Kolkata': 'INR',
      'Asia/Shanghai': 'CNY',
      'Asia/Tokyo': 'JPY',
      
      // Autres
      'Australia/Sydney': 'AUD',
      'America/Sao_Paulo': 'BRL',
      'America/Mexico_City': 'MXN'
    };
    
    return currencyMapping[timezoneName] || 'EUR'; // Default to EUR
  }

  /**
   * Détermine la timezone appropriée basée sur le contexte du gig
   */
  private static getContextualTimezone(context: string, timezonesList: any[]): string | null {
    const contextLower = context.toLowerCase();
    
    // PRIORITÉ 1: Demandes explicites de timezone/pays (plus prioritaire)
    const explicitRequests = [
      { patterns: ['ethiopia', 'ethiopian', 'addis ababa', 'time zone de ethiopia', 'timezone de ethiopia'], zone: 'Africa/Addis_Ababa' },
      { patterns: ['morocco', 'maroc', 'casablanca', 'rabat'], zone: 'Africa/Casablanca' },
      { patterns: ['tunisia', 'tunisie', 'tunis'], zone: 'Africa/Tunis' },
      { patterns: ['algeria', 'algérie', 'algiers', 'alger'], zone: 'Africa/Algiers' },
      { patterns: ['egypt', 'egypte', 'cairo', 'le caire'], zone: 'Africa/Cairo' },
      { patterns: ['south africa', 'afrique du sud', 'johannesburg', 'cape town'], zone: 'Africa/Johannesburg' },
      { patterns: ['kenya', 'nairobi'], zone: 'Africa/Nairobi' },
      { patterns: ['nigeria', 'lagos'], zone: 'Africa/Lagos' },
      { patterns: ['ghana', 'accra'], zone: 'Africa/Accra' },
      { patterns: ['senegal', 'sénégal', 'dakar'], zone: 'Africa/Dakar' },
      { patterns: ['ivory coast', 'côte d\'ivoire', 'abidjan'], zone: 'Africa/Abidjan' },
      { patterns: ['india', 'inde', 'mumbai', 'delhi', 'bangalore', 'kolkata'], zone: 'Asia/Kolkata' },
      { patterns: ['china', 'chine', 'beijing', 'shanghai'], zone: 'Asia/Shanghai' },
      { patterns: ['japan', 'japon', 'tokyo'], zone: 'Asia/Tokyo' },
      { patterns: ['australia', 'australie', 'sydney'], zone: 'Australia/Sydney' },
      { patterns: ['brazil', 'brésil', 'sao paulo', 'rio'], zone: 'America/Sao_Paulo' },
      { patterns: ['mexico', 'mexique', 'mexico city'], zone: 'America/Mexico_City' }
    ];

    // Vérifier les demandes explicites en premier
    for (const request of explicitRequests) {
      if (request.patterns.some(pattern => contextLower.includes(pattern))) {
        const timezone = timezonesList.find(tz => tz.zoneName === request.zone);
        if (timezone) return timezone._id;
      }
    }
    
    // PRIORITÉ 2: Indicateurs de contexte métier (moins prioritaire)
    // Indicateurs géographiques français
    const frenchIndicators = [
      'france', 'français', 'french', 'paris', 'lyon', 'marseille',
      'april', 'spvie', 'alptis', 'harmonie mutuelle', 'maaf', 'macif',
      'assurance santé', 'mutuelle', 'sécurité sociale', 'cpam'
    ];
    
    // Indicateurs européens
    const europeanIndicators = [
      'europe', 'european', 'eu', 'cet', 'cest', 'berlin', 'amsterdam',
      'brussels', 'madrid', 'rome', 'vienna'
    ];
    
    // Indicateurs nord-américains
    const northAmericanIndicators = [
      'usa', 'united states', 'america', 'canada', 'new york', 'california',
      'toronto', 'vancouver', 'est', 'pst', 'mst', 'cst'
    ];
    
    // Indicateurs britanniques
    const ukIndicators = [
      'uk', 'united kingdom', 'britain', 'british', 'london', 'england',
      'scotland', 'wales', 'gmt', 'bst'
    ];
    
    let targetZone = null;
    
    if (frenchIndicators.some(indicator => contextLower.includes(indicator))) {
      targetZone = 'Europe/Paris';
    } else if (ukIndicators.some(indicator => contextLower.includes(indicator))) {
      targetZone = 'Europe/London';
    } else if (europeanIndicators.some(indicator => contextLower.includes(indicator))) {
      targetZone = 'Europe/Paris'; // Par défaut Europe centrale
    } else if (northAmericanIndicators.some(indicator => contextLower.includes(indicator))) {
      if (contextLower.includes('california') || contextLower.includes('pst')) {
        targetZone = 'America/Los_Angeles';
      } else {
        targetZone = 'America/New_York';
      }
    }
    
    if (targetZone) {
      const timezone = timezonesList.find(tz => tz.zoneName === targetZone);
      return timezone ? timezone._id : null;
    }
    
    return null;
  }
}
