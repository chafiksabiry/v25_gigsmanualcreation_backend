import OpenAI from 'openai';

// Configuration sécurisée d'OpenAI côté backend - initialisation conditionnelle
let openai: OpenAI | null = null;

const getOpenAIClient = (): OpenAI => {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured properly');
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
};

export interface GigSuggestion {
  title: string;
  description: string;
  category: string;
  destination_zone: string;
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

const TEAM_ROLES = [
  "Team Lead",
  "Agent Senior",
  "Agent",
  "Agent Junior",
  "Supervisor",
  "Manager",
  "Coordinator",
  "Specialist",
  "Consultant",
  "Representative",
  "Associate",
  "Assistant",
  "Trainee",
  "Intern"
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
   * Analyse simple de la description pour détecter les pays mentionnés
   * Même logique que les timezones : recherche directe dans les données API
   */
  private static analyzeDescriptionForCountry(description: string, countriesData?: any[]): string {
    if (!countriesData || countriesData.length === 0) {
      console.log('⚠️ Aucune donnée pays disponible pour l\'analyse');
      return '';
    }

    const descriptionLower = description.toLowerCase();
    console.log(`🔍 RECHERCHE DIRECTE pays dans ${countriesData.length} pays de l'API`);

    // Recherche directe dans le texte pour tous les pays de l'API (même logique que les timezones)
    for (const country of countriesData) {
      const namesToCheck = [
        country.name?.common?.toLowerCase(),
        country.name?.official?.toLowerCase(),
        // Exclure les codes pays de 2 lettres pour éviter les faux positifs
        // country.cca2?.toLowerCase(),
        ...Object.values(country.name?.nativeName || {}).flatMap((native: any) => [
          native?.common?.toLowerCase(),
          native?.official?.toLowerCase()
        ]).filter(Boolean)
      ].filter(Boolean);

      for (const name of namesToCheck) {
        if (name && name.length >= 4 && descriptionLower.includes(name)) {
          console.log(`🔍 PAYS TROUVÉ: "${name}" → ${country.name.common} (${country.cca2})`);
          return country.name.common;
        }
      }
    }

    console.log('🔍 AUCUN PAYS DÉTECTÉ dans la description');
    return '';
  }

  /**
   * Trouve un ID de pays basé sur le nom du pays (similaire à findTimezoneId)
   */
  private static findCountryId(countryName: string, countriesData?: any[], fullContext?: string): string {
    if (!countriesData || countriesData.length === 0) {
      console.log('⚠️  Aucune donnée pays disponible');
      return '';
    }

    const normalizedName = countryName.toLowerCase().trim();
    console.log(`🔍 Recherche pays: "${normalizedName}" dans ${countriesData.length} pays`);

    // 1. Recherche par nom commun exact
    let country = countriesData.find((c: any) =>
      c.name?.common?.toLowerCase() === normalizedName
    );
    if (country) {
      console.log(`✅ Trouvé par nom commun: ${country.name.common} (${country.cca2}) → ${country._id}`);
      return country._id;
    }

    // 2. Recherche par nom officiel exact
    country = countriesData.find((c: any) =>
      c.name?.official?.toLowerCase() === normalizedName
    );
    if (country) {
      console.log(`✅ Trouvé par nom officiel: ${country.name.official} (${country.cca2}) → ${country._id}`);
      return country._id;
    }

    // 3. Recherche par inclusion dans nom commun
    country = countriesData.find((c: any) =>
      c.name?.common?.toLowerCase().includes(normalizedName) ||
      normalizedName.includes(c.name?.common?.toLowerCase())
    );
    if (country) {
      console.log(`✅ Trouvé par inclusion nom commun: ${country.name.common} (${country.cca2}) → ${country._id}`);
      return country._id;
    }

    // 4. Recherche par inclusion dans nom officiel
    country = countriesData.find((c: any) =>
      c.name?.official?.toLowerCase().includes(normalizedName) ||
      normalizedName.includes(c.name?.official?.toLowerCase())
    );
    if (country) {
      console.log(`✅ Trouvé par inclusion nom officiel: ${country.name.official} (${country.cca2}) → ${country._id}`);
      return country._id;
    }

    // 5. Recherche dans les noms natifs
    country = countriesData.find((c: any) => {
      if (c.name?.nativeName) {
        for (const lang in c.name.nativeName) {
          const nativeLang = c.name.nativeName[lang];
          if (nativeLang?.common?.toLowerCase().includes(normalizedName) ||
            nativeLang?.official?.toLowerCase().includes(normalizedName)) {
            return true;
          }
        }
      }
      return false;
    });
    if (country) {
      console.log(`✅ Trouvé par nom natif: ${country.name.common} (${country.cca2}) → ${country._id}`);
      return country._id;
    }

    console.log(`❌ Pays "${normalizedName}" non trouvé dans l'API`);
    return '';
  }

  /**
   * Trouve un code pays basé sur le nom du pays ou timezone (version legacy)
   */
  private static findCountryCode(countryName: string, countriesData?: any[]): string {
    if (!countriesData || countriesData.length === 0) {
      // Fallback par défaut si pas de données pays
      return 'FR'; // France par défaut
    }

    const normalizedName = countryName.toLowerCase().trim();

    // Mappings directs pour les noms courants (priorité haute)
    const directMappings: { [key: string]: string } = {
      'morocco': 'MA',
      'maroc': 'MA',
      'bangladesh': 'BD',
      'bengladish': 'BD',
      'egypt': 'EG',
      'égypte': 'EG',
      'egypte': 'EG',
      'france': 'FR',
      'united states': 'US',
      'usa': 'US',
      'uk': 'GB',
      'united kingdom': 'GB',
      'spain': 'ES',
      'espagne': 'ES',
      'italy': 'IT',
      'italie': 'IT',
      'germany': 'DE',
      'allemagne': 'DE',
      'ethiopia': 'ET',
      'éthiopie': 'ET',
      'japan': 'JP',
      'japon': 'JP',
      'china': 'CN',
      'chine': 'CN',
      'australia': 'AU',
      'australie': 'AU',
      'turkey': 'TR',
      'turquie': 'TR',
      'türkiye': 'TR'
    };

    // Vérifier les mappings directs d'abord
    if (directMappings[normalizedName]) {
      return directMappings[normalizedName];
    }

    // Rechercher par code CCA2 si c'est déjà un code
    if (countryName.length === 2) {
      const country = countriesData.find((c: any) =>
        c.cca2?.toLowerCase() === normalizedName
      );
      if (country) return country.cca2;
    }

    // Rechercher par nom commun (exact match d'abord)
    let country = countriesData.find((c: any) =>
      c.name?.common?.toLowerCase() === normalizedName
    );

    // Rechercher par nom officiel (exact match)
    if (!country) {
      country = countriesData.find((c: any) =>
        c.name?.official?.toLowerCase() === normalizedName
      );
    }

    // Rechercher par inclusion dans le nom commun
    if (!country) {
      country = countriesData.find((c: any) =>
        c.name?.common?.toLowerCase().includes(normalizedName) ||
        normalizedName.includes(c.name?.common?.toLowerCase())
      );
    }

    // Rechercher par inclusion dans le nom officiel
    if (!country) {
      country = countriesData.find((c: any) =>
        c.name?.official?.toLowerCase().includes(normalizedName) ||
        normalizedName.includes(c.name?.official?.toLowerCase())
      );
    }

    // Rechercher dans les noms natifs (pour l'API externe avec structure MongoDB)
    if (!country) {
      country = countriesData.find((c: any) => {
        if (c.name?.nativeName) {
          for (const lang in c.name.nativeName) {
            const nativeLang = c.name.nativeName[lang];
            if (nativeLang?.common?.toLowerCase().includes(normalizedName) ||
              nativeLang?.official?.toLowerCase().includes(normalizedName)) {
              return true;
            }
          }
        }
        return false;
      });
    }

    // Mapping spécial pour les timezones communes
    if (!country) {
      const timezoneToCountry: { [key: string]: string } = {
        'europe/paris': 'FR',
        'europe/london': 'GB',
        'america/new_york': 'US',
        'america/los_angeles': 'US',
        'africa/addis_ababa': 'ET',
        'africa/casablanca': 'MA',
        'africa/cairo': 'EG',
        'asia/dhaka': 'BD',
        'asia/tokyo': 'JP',
        'asia/shanghai': 'CN',
        'australia/sydney': 'AU'
      };

      const mappedCode = timezoneToCountry[normalizedName];
      if (mappedCode) {
        country = countriesData.find((c: any) => c.cca2 === mappedCode);
      }
    }

    return country?.cca2 || 'FR'; // Fallback vers France
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
    timezonesData?: any[],
    countriesData?: any[],
    currenciesData?: any[]
  ): Promise<GigSuggestion> {
    if (!this.isValidApiKey()) {
      throw new Error('OpenAI API key not configured properly');
    }

    if (!description) {
      throw new Error('Description is required');
    }

    // Valider que nous avons des données minimales
    if (!countriesData || countriesData.length === 0) {
      console.warn('⚠️ Aucune donnée pays disponible pour OpenAI');
    }
    if (!activitiesData || activitiesData.length === 0) {
      console.warn('⚠️ Aucune donnée activités disponible pour OpenAI');
    }

    // Créer les listes pour le prompt OpenAI (optimisées pour réduire les tokens)
    const activityNames = activitiesData.slice(0, 10).map(activity => activity.name); // Limiter à 10
    const industryNames = industriesData.slice(0, 10).map(industry => industry.name); // Limiter à 10
    const languageNames = languagesData.slice(0, 10).map(lang => lang.name); // Limiter à 10
    const softSkillNames = skillsData.soft.slice(0, 10).map(skill => skill.name); // Limiter à 10
    const professionalSkillNames = skillsData.professional.slice(0, 10).map(skill => skill.name); // Limiter à 10
    const technicalSkillNames = skillsData.technical.slice(0, 10).map(skill => skill.name); // Limiter à 10
    const currencyOptions = currenciesData ? currenciesData.slice(0, 10).map(currency => `${currency.code}: ${currency._id}`).join(', ') : [];

    // Prioriser les pays importants pour les gigs (France, pays francophones, Europe, etc.)
    const priorityCountries = ['France', 'Egypt', 'Belgium', 'Switzerland', 'Canada', 'Morocco', 'Tunisia', 'Algeria', 'Senegal', 'United States', 'United Kingdom', 'Germany', 'Spain', 'Italy'];
    const sortedCountries = countriesData ? [...countriesData].sort((a, b) => {
      const aIsPriority = priorityCountries.includes(a.name.common);
      const bIsPriority = priorityCountries.includes(b.name.common);
      if (aIsPriority && !bIsPriority) return -1;
      if (!aIsPriority && bIsPriority) return 1;
      return a.name.common.localeCompare(b.name.common);
    }) : [];

    // Limiter à 30 pays maximum pour respecter la limite de tokens OpenAI
    const countryOptions = sortedCountries.slice(0, 30).map(country => `${country.name.common}: ${country._id}`).join(', ');

    console.log(`🔍 Prompt préparé avec ${sortedCountries.length} pays (limité à 30), ${activityNames.length} activités`);
    console.log(`🔍 Première pays dans la liste: ${sortedCountries.slice(0, 5).map(c => c.name.common).join(', ')}`);

    const prompt = `Based on: "${description}"

IMPORTANT: 
- Respond in the SAME LANGUAGE as input
- For destination_zone, use ONLY MongoDB ObjectId from COUNTRIES list
- For currency, use ONLY MongoDB ObjectId from CURRENCIES list inside the object structure
- Detect country from language/currency/context
- Use only options below:

CATEGORIES (choose the most appropriate one):
${PREDEFINED_CATEGORIES.join(', ')}

COUNTRIES (use the ObjectId for destination_zone):
${countryOptions}

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

CURRENCIES (use the ObjectId):
${currencyOptions}

TEAM ROLES (choose the most appropriate ones from this list):
${TEAM_ROLES.join(', ')}

RULES:
- Same language as input
- Match country to context/language
- Days: Monday, Tuesday, etc. (no "Other days")
- Seniority: Entry Level/Junior/Mid-Level/Senior/Manager
- team.structure.roleId: MUST be one of the TEAM ROLES listed above. Analyze the description to determine appropriate roles and counts (e.g. if "needs a manager and 3 agents", return 1 Manager and 3 Agents).
- minimumVolume is a QUANTITY (e.g. number of calls). EXTRACT the exact number from text if stated (e.g. "17 calls or more" -> amount: "17"). Defaults to "30" ONLY if not specified.
- If a bonus is mentioned for a specific volume (e.g. "bonus if > 17 calls"), set minimumVolume.amount to that number ("17") and put the bonus amount in bonusAmount.

JSON format:
{
  "jobTitles": ["Main job title suggestion (SAME LANGUAGE AS USER QUERY)", "Alternative job title (SAME LANGUAGE AS USER QUERY)", "Another option (SAME LANGUAGE AS USER QUERY)"],
  "jobDescription": "Enhanced description (IN SAME LANGUAGE AS USER QUERY)",
  "highlights": ["Key selling point 1 (SAME LANGUAGE AS USER QUERY)", "Key selling point 2 (SAME LANGUAGE AS USER QUERY)", "Key selling point 3 (SAME LANGUAGE AS USER QUERY)"],
  "deliverables": ["Expected outcome 1 (SAME LANGUAGE AS USER QUERY)", "Expected outcome 2 (SAME LANGUAGE AS USER QUERY)", "Expected outcome 3 (SAME LANGUAGE AS USER QUERY)"],
  "category": "One of the predefined categories above",
  "destination_zone": "MONGODB_OBJECTID_FROM_COUNTRIES_LIST",
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
    "commission_per_call": 0,
    "bonusAmount": 150,
    "currency": {
      "$oid": "MONGODB_OBJECTID_FROM_CURRENCIES_LIST"
    },
    "minimumVolume": {
      "amount": "25",
      "period": "Monthly",
      "unit": "Calls"
    },
    "transactionCommission": 50,
    "additionalDetails": "A comprehensive and detailed explanation of the compensation structure (at least 2-3 sentences). Include payment frequency (e.g., weekly/monthly), specific conditions for the bonus, and any other relevant financial terms. Respond in the SAME LANGUAGE as the user query."
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
      console.log('🤖 Appel OpenAI en cours...');

      const completion = await getOpenAIClient().chat.completions.create({
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

      console.log('✅ Réponse OpenAI reçue');
      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      try {
        const parsedResponse = this.parseOpenAIResponse(content);

        // OpenAI doit retourner directement les ObjectIds MongoDB - pas de conversion nécessaire
        console.log(`🔍 destination_zone reçu d'OpenAI: "${parsedResponse.destination_zone}"`);

        // Valider que destination_zone est un ObjectId valide
        if (parsedResponse.destination_zone && typeof parsedResponse.destination_zone === 'string' && parsedResponse.destination_zone.length === 24) {
          console.log(`✅ destination_zone est un ObjectId valide: ${parsedResponse.destination_zone}`);
        } else {
          console.log(`⚠️ destination_zone n'est pas un ObjectId MongoDB valide: "${parsedResponse.destination_zone}"`);
        }

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

        // Valider et structurer la devise
        // Valider et structurer la devise et les champs de commission
        if (parsedResponse.commission) {
          // 1. Currency validation
          let currencyValue = parsedResponse.commission.currency;

          // Cas 1: L'IA a retourné un objet avec $oid (format demandé)
          // Cas 1: L'IA a retourné un objet avec $oid (format demandé)
          if (currencyValue && typeof currencyValue === 'object' && currencyValue.$oid) {
            // Vérifier si c'est un ObjectId valide (24 chars hex)
            const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(currencyValue.$oid);

            if (!isValidObjectId) {
              console.log(`⚠️ Currency $oid "${currencyValue.$oid}" n'est pas un ID valide. Recherche par code...`);
              // C'est probablement un code comme "EUR" ms dans le champ $oid
              const currencyId = this.findCurrencyId(currencyValue.$oid, currenciesData || []);
              parsedResponse.commission.currency = { $oid: currencyId };
            }
            // Sinon, c'est un bon ID, on garde tel quel
          }
          // Cas 2: L'IA a retourné une string (code ou ID)
          else if (currencyValue && typeof currencyValue === 'string') {
            const currencyId = this.findCurrencyId(currencyValue, currenciesData || []);
            parsedResponse.commission.currency = { $oid: currencyId };
          }
          // Cas 3: Pas de devise ou format invalide -> Default EUR object
          else {
            const defaultCurrencyId = currenciesData && currenciesData.length > 0
              ? (currenciesData.find((c: any) => c.code === 'EUR')?._id || currenciesData[0]._id)
              : "eur-id-placeholder";
            parsedResponse.commission.currency = { $oid: defaultCurrencyId };
          }

          // 2. Strict type enforcement for other commission fields
          // transactionCommission must be a number
          const rawTransComm = parsedResponse.commission.transactionCommission;
          parsedResponse.commission.transactionCommission =
            typeof rawTransComm === 'string' ? (parseFloat(rawTransComm) || 0) : (rawTransComm || 0);

          // bonusAmount must be a number
          const rawBonus = parsedResponse.commission.bonusAmount;
          parsedResponse.commission.bonusAmount = typeof rawBonus === 'string' ? (parseFloat(rawBonus) || 0) : (rawBonus || 0);

          // commission_per_call must be a number (handling potential AI inconsistencies)
          const rawCommPerCall = parsedResponse.commission.commission_per_call || parsedResponse.commission.commissionPerCall;
          parsedResponse.commission.commission_per_call = typeof rawCommPerCall === 'string' ? (parseFloat(rawCommPerCall) || 0) : (rawCommPerCall || 0);
          // Remove camelCase duplicate if present to ensure clean output
          delete parsedResponse.commission.commissionPerCall;

          // minimumVolume must ensure inner fields are strings where expected
          if (parsedResponse.commission.minimumVolume) {
            parsedResponse.commission.minimumVolume.amount = String(parsedResponse.commission.minimumVolume.amount || "0");
            parsedResponse.commission.minimumVolume.unit = parsedResponse.commission.minimumVolume.unit || "Calls";
            parsedResponse.commission.minimumVolume.period = parsedResponse.commission.minimumVolume.period || "Monthly";
          } else {
            parsedResponse.commission.minimumVolume = {
              amount: "0",
              period: "Monthly",
              unit: "Calls"
            };
          }

          // additionalDetails must be string
          parsedResponse.commission.additionalDetails = parsedResponse.commission.additionalDetails || "";
        }

        // Convertir les timezones en IDs avec contexte intelligent
        const timezoneContext = `${parsedResponse.title || ''} ${parsedResponse.description || ''} ${description}`;

        // Gérer l'ancien format (schedule.schedules) pour rétrocompatibilité
        if (parsedResponse.schedule?.schedules && timezonesData) {
          parsedResponse.schedule.schedules = parsedResponse.schedule.schedules.map((schedule: any) => ({
            ...schedule,
            timezone: this.findTimezoneId(schedule.timezone || 'UTC', timezonesData, timezoneContext)
          }));
        }

        // Gérer le nouveau format (availability.time_zone)
        if (parsedResponse.availability?.time_zone && timezonesData) {
          const originalTimezoneName = parsedResponse.availability.time_zone;
          const timezoneId = this.findTimezoneId(
            originalTimezoneName,
            timezonesData,
            timezoneContext
          );
          parsedResponse.availability.time_zone = timezoneId;

          // Mettre à jour la currency basée sur la timezone
          if (parsedResponse.commission) {
            const currencyCode = this.getCurrencyFromTimezone(originalTimezoneName);
            if (currenciesData && currenciesData.length > 0) {
              parsedResponse.commission.currency = this.findCurrencyId(currencyCode, currenciesData);
            } else {
              parsedResponse.commission.currency = currencyCode;
            }
          }
        }

        // Convertir les territories en IDs
        if (parsedResponse.team?.territories && countriesData) {
          console.log(`🏴 TERRITORIES AVANT conversion:`, parsedResponse.team.territories);
          console.log(`🌍 COUNTRIES DATA disponible:`, countriesData.length, 'pays');
          parsedResponse.team.territories = parsedResponse.team.territories.map((territory: string) => {
            const result = this.findTerritoryId(territory, countriesData);
            console.log(`🏴 TERRITORY: "${territory}" → ${result}`);
            return result;
          });
          console.log(`🏴 TERRITORIES APRÈS conversion:`, parsedResponse.team.territories);
        }

        // Convertir les timeZones dans le schedule principal (rétrocompatibilité)
        if (parsedResponse.schedule?.timeZones && timezonesData) {
          parsedResponse.schedule.timeZones = parsedResponse.schedule.timeZones.map((tz: string) =>
            this.findTimezoneId(tz, timezonesData, timezoneContext)
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
      const completion = await getOpenAIClient().chat.completions.create({
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
      const completion = await getOpenAIClient().chat.completions.create({
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
      const completion = await getOpenAIClient().chat.completions.create({
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
  static findSkillId(skillName: string, skillsList: any[]): string {
    // Exact match first
    let skill = skillsList.find(s => s.name.toLowerCase() === skillName.toLowerCase());
    if (skill) {
      return skill._id;
    }

    // Try partial match (skill name contains the search term or vice versa)
    skill = skillsList.find(s =>
      s.name.toLowerCase().includes(skillName.toLowerCase()) ||
      skillName.toLowerCase().includes(s.name.toLowerCase())
    );
    if (skill) {
      console.log(`⚠️  Partial skill match found: "${skillName}" -> "${skill.name}" (${skill._id})`);
      return skill._id;
    }

    // Try fuzzy matching by removing common words and checking similarity
    const normalizedSearchName = skillName.toLowerCase()
      .replace(/\b(support|management|system|software|platform|tool|service|application|technology)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (normalizedSearchName) {
      skill = skillsList.find(s => {
        const normalizedSkillName = s.name.toLowerCase()
          .replace(/\b(support|management|system|software|platform|tool|service|application|technology)\b/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        return normalizedSkillName.includes(normalizedSearchName) ||
          normalizedSearchName.includes(normalizedSkillName);
      });
      if (skill) {
        console.log(`⚠️  Fuzzy skill match found: "${skillName}" -> "${skill.name}" (${skill._id})`);
        return skill._id;
      }
    }

    // Log when no match is found and return the first skill as fallback
    console.error(`❌ No skill match found for: "${skillName}". Available skills: ${skillsList.map(s => s.name).join(', ')}`);

    // Return the first available skill as fallback instead of the name
    if (skillsList.length > 0) {
      console.log(`⚠️  Using fallback skill: "${skillsList[0].name}" (${skillsList[0]._id}) for "${skillName}"`);
      return skillsList[0]._id;
    }

    // This should never happen, but if no skills are available, return a default
    console.error(`❌ No skills available in the list! Returning empty string for "${skillName}"`);
    return '';
  }

  /**
   * Trouve l'ID d'une activité par son nom avec correspondance approximative
   */
  static findActivityId(activityName: string, activitiesList: any[]): string {
    // Recherche exacte d'abord
    let activity = activitiesList.find(a => a.name.toLowerCase() === activityName.toLowerCase());
    if (activity) {
      return activity._id;
    }

    // Recherche approximative si pas de correspondance exacte
    const normalizedSearchName = activityName.toLowerCase().trim();

    // Essayer de trouver une correspondance partielle
    activity = activitiesList.find(a => {
      const normalizedActivityName = a.name.toLowerCase().trim();
      return normalizedActivityName.includes(normalizedSearchName) ||
        normalizedSearchName.includes(normalizedActivityName);
    });

    if (activity) {
      console.log(`🔄 Correspondance approximative trouvée: "${activityName}" → "${activity.name}" (${activity._id})`);
      return activity._id;
    }

    // Mapping manuel pour les cas courants
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
      activity = activitiesList.find(a => a.name.toLowerCase() === mappedName.toLowerCase());
      if (activity) {
        console.log(`🔄 Mapping manuel trouvé: "${activityName}" → "${activity.name}" (${activity._id})`);
        return activity._id;
      }
    }

    // Si aucune correspondance n'est trouvée, utiliser la première activité par défaut
    // au lieu de retourner le string original
    if (activitiesList.length > 0) {
      const defaultActivity = activitiesList[0];
      console.warn(`⚠️  Aucune correspondance pour l'activité "${activityName}", utilisation par défaut: "${defaultActivity.name}" (${defaultActivity._id})`);
      return defaultActivity._id;
    }

    // En dernier recours, retourner un ID générique (ne devrait jamais arriver)
    console.error(`❌ Impossible de mapper l'activité "${activityName}" et aucune activité par défaut disponible`);
    return 'unknown-activity-id';
  }

  /**
   * Trouve l'ID d'une industrie par son nom avec correspondance approximative
   */
  static findIndustryId(industryName: string, industriesList: any[]): string {
    // Recherche exacte d'abord
    let industry = industriesList.find(i => i.name.toLowerCase() === industryName.toLowerCase());
    if (industry) {
      return industry._id;
    }

    // Recherche approximative si pas de correspondance exacte
    const normalizedSearchName = industryName.toLowerCase().trim();

    // Essayer de trouver une correspondance partielle
    industry = industriesList.find(i => {
      const normalizedIndustryName = i.name.toLowerCase().trim();
      return normalizedIndustryName.includes(normalizedSearchName) ||
        normalizedSearchName.includes(normalizedIndustryName);
    });

    if (industry) {
      console.log(`🔄 Correspondance approximative trouvée pour industrie: "${industryName}" → "${industry.name}" (${industry._id})`);
      return industry._id;
    }

    // Mapping manuel pour les cas courants
    const manualMappings: { [key: string]: string } = {
      'insurance': 'Insurance',
      'assurance': 'Insurance',
      'healthcare': 'Healthcare',
      'santé': 'Healthcare',
      'technology': 'Technology',
      'technologie': 'Technology',
      'finance': 'Finance',
      'banking': 'Banking',
      'banque': 'Banking'
    };

    const mappedName = manualMappings[normalizedSearchName];
    if (mappedName) {
      industry = industriesList.find(i => i.name.toLowerCase() === mappedName.toLowerCase());
      if (industry) {
        console.log(`🔄 Mapping manuel trouvé pour industrie: "${industryName}" → "${industry.name}" (${industry._id})`);
        return industry._id;
      }
    }

    // Si aucune correspondance n'est trouvée, utiliser la première industrie par défaut
    if (industriesList.length > 0) {
      const defaultIndustry = industriesList[0];
      console.warn(`⚠️  Aucune correspondance pour l'industrie "${industryName}", utilisation par défaut: "${defaultIndustry.name}" (${defaultIndustry._id})`);
      return defaultIndustry._id;
    }

    // En dernier recours, retourner un ID générique
    console.error(`❌ Impossible de mapper l'industrie "${industryName}" et aucune industrie par défaut disponible`);
    return 'unknown-industry-id';
  }

  /**
   * Trouve l'ID d'une devise par son code
   */
  static findCurrencyId(currencyCode: string, currenciesList: any[]): string {
    if (!currenciesList || currenciesList.length === 0) {
      console.warn(`⚠️  Aucune devise disponible pour "${currencyCode}"`);
      return currencyCode; // Retourner le code tel quel si pas de données
    }

    // Recherche exacte par code
    const currency = currenciesList.find(c => c.code && c.code.toUpperCase() === currencyCode.toUpperCase());
    if (currency) {
      console.log(`✅ Devise trouvée: ${currencyCode} → ${currency.name} (${currency._id})`);
      return currency._id;
    }

    // Si pas trouvé, utiliser USD par défaut ou la première devise disponible
    const defaultCurrency = currenciesList.find(c => c.code === 'USD') || currenciesList[0];
    if (defaultCurrency) {
      console.warn(`⚠️  Devise "${currencyCode}" non trouvée, utilisation par défaut: ${defaultCurrency.code} (${defaultCurrency._id})`);
      return defaultCurrency._id;
    }

    // En dernier recours
    console.error(`❌ Impossible de mapper la devise "${currencyCode}"`);
    return currencyCode;
  }

  /**
   * Trouve l'ID d'une langue par son nom
   */
  static findLanguageId(languageName: string, languagesList: any[]): string {
    const language = languagesList.find(l => l.name.toLowerCase() === languageName.toLowerCase());
    return language ? language._id : languageName;
  }

  /**
   * Trouve l'ID d'un territoire/pays par son nom
   */
  static findTerritoryId(territoryName: string, countriesList: any[]): string {
    console.log(`🔍 RECHERCHE TERRITORY: "${territoryName}" dans ${countriesList?.length || 0} pays`);

    if (!countriesList || countriesList.length === 0) {
      console.log(`❌ COUNTRIES LIST vide ou undefined`);
      return territoryName;
    }

    // Recherche par nom de pays exact (common)
    let territory = countriesList.find(country =>
      country.name?.common?.toLowerCase() === territoryName.toLowerCase()
    );
    if (territory) return territory._id;

    // Recherche par nom officiel
    territory = countriesList.find(country =>
      country.name?.official?.toLowerCase() === territoryName.toLowerCase()
    );
    if (territory) return territory._id;

    // Recherche partielle par nom de pays (common)
    territory = countriesList.find(country =>
      country.name?.common?.toLowerCase().includes(territoryName.toLowerCase())
    );
    if (territory) return territory._id;

    // Recherche partielle par nom officiel
    territory = countriesList.find(country =>
      country.name?.official?.toLowerCase().includes(territoryName.toLowerCase())
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
      territory = countriesList.find(country =>
        country.name?.common?.toLowerCase() === mappedCountry.toLowerCase() ||
        country.name?.official?.toLowerCase() === mappedCountry.toLowerCase()
      );
      if (territory) return territory._id;
    }

    // Fallback: retourner le nom original si pas trouvé
    console.log(`❌ TERRITORY "${territoryName}" non trouvé, retour du nom original`);
    return territoryName;
  }

  /**
   * Trouve l'ID d'une timezone par son nom avec contexte intelligent
   */
  static findTimezoneId(timezoneName: string, timezonesList: any[], context?: string): string {
    if (!timezonesList || timezonesList.length === 0) return timezoneName;

    // Recherche exacte par zoneName
    let timezone = timezonesList.find(tz => tz.zoneName === timezoneName);
    if (timezone) return timezone._id;

    // Analyse contextuelle pour déterminer la région probable
    const contextualMapping = this.getContextualTimezone(context || '', timezonesList, undefined);
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
    timezone = timezonesList.find(tz => tz.zoneName === 'Europe/Paris') || // France par défaut
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
      // Europe nordique
      'Europe/Oslo': 'NOK',
      'Europe/Stockholm': 'SEK',
      'Europe/Copenhagen': 'DKK',
      'Europe/Helsinki': 'EUR',
      'Atlantic/Reykjavik': 'ISK',

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
   * Utilise uniquement les données des APIs externes
   */
  private static getContextualTimezone(context: string, timezonesList: any[], countriesData?: any[]): string | null {
    if (!timezonesList || timezonesList.length === 0) {
      console.log('⚠️ Aucune donnée timezone disponible pour l\'analyse contextuelle');
      return null;
    }

    const contextLower = context.toLowerCase();
    console.log(`🔍 ANALYSE TIMEZONE contextuelle dans ${timezonesList.length} timezones`);

    // PRIORITÉ 1: Recherche directe dans les noms de zones et pays des timezones
    for (const timezone of timezonesList) {
      const searchTerms = [
        timezone.zoneName?.toLowerCase(),
        timezone.countryName?.toLowerCase(),
        timezone.cityName?.toLowerCase(),
        timezone.regionName?.toLowerCase()
      ].filter(Boolean);

      for (const term of searchTerms) {
        if (contextLower.includes(term)) {
          console.log(`🌐 TIMEZONE DIRECTE: "${term}" trouvé → ${timezone.zoneName} (${timezone._id})`);
          return timezone._id;
        }
      }
    }

    // PRIORITÉ 2: Recherche par pays via l'API countries
    if (countriesData && countriesData.length > 0) {
      for (const country of countriesData) {
        const countryTerms = [
          country.name?.common?.toLowerCase(),
          country.name?.official?.toLowerCase(),
          country.cca2?.toLowerCase(),
          ...Object.values(country.name?.nativeName || {}).flatMap((native: any) => [
            native?.common?.toLowerCase(),
            native?.official?.toLowerCase()
          ]).filter(Boolean)
        ].filter(Boolean);

        for (const term of countryTerms) {
          if (contextLower.includes(term)) {
            // Chercher la timezone correspondant à ce pays
            const matchingTimezone = timezonesList.find(tz =>
              tz.countryName?.toLowerCase().includes(country.name?.common?.toLowerCase()) ||
              tz.countryCode === country.cca2
            );

            if (matchingTimezone) {
              console.log(`🌐 TIMEZONE VIA PAYS: "${term}" → ${country.name.common} → ${matchingTimezone.zoneName} (${matchingTimezone._id})`);
              return matchingTimezone._id;
            }
          }
        }
      }
    }

    // PRIORITÉ 3: Recherche par patterns de timezone communes
    const timezonePatterns = [
      { patterns: ['utc', 'gmt'], fallback: 'UTC' },
      { patterns: ['est', 'eastern'], fallback: 'America/New_York' },
      { patterns: ['pst', 'pacific'], fallback: 'America/Los_Angeles' },
      { patterns: ['cet', 'central european'], fallback: 'Europe/Paris' },
      { patterns: ['jst', 'japan'], fallback: 'Asia/Tokyo' }
    ];

    for (const { patterns, fallback } of timezonePatterns) {
      if (patterns.some(pattern => contextLower.includes(pattern))) {
        const timezone = timezonesList.find(tz => tz.zoneName === fallback);
        if (timezone) {
          console.log(`🌐 TIMEZONE PATTERN: "${patterns[0]}" → ${fallback} (${timezone._id})`);
          return timezone._id;
        }
      }
    }

    console.log('🔍 AUCUNE TIMEZONE CONTEXTUELLE détectée');
    return null;
  }
}
