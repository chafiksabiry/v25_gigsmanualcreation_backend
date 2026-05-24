import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// Configuration sécurisée d'OpenAI côté backend - initialisation conditionnelle
let openai: OpenAI | null = null;
let anthropic: Anthropic | null = null;

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

const getAnthropicClient = (): Anthropic | null => {
  if (anthropic) return anthropic;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  anthropic = new Anthropic({ apiKey: key });
  return anthropic;
};

/** Valid Anthropic model IDs (try in order if one returns 404) */
const ANTHROPIC_MODEL_CANDIDATES = [
  process.env.ANTHROPIC_MODEL,
  'claude-sonnet-4-20250514',
  'claude-3-5-sonnet-20241022',
  'claude-3-haiku-20240307',
].filter((m): m is string => !!m && m.trim().length > 0);

function isAnthropicModelNotFound(err: unknown): boolean {
  const e = err as any;
  const status = e?.status ?? e?.response?.status;
  const msg = String(e?.message || e?.error?.message || '').toLowerCase();
  return status === 404 || msg.includes('not_found') || msg.includes('model:');
}

/** Detect transient/failure errors where fallback to Claude makes sense */
function shouldFallbackToClaude(err: unknown): boolean {
  if (!err) return false;
  const e = err as any;
  const status: number | undefined = e?.status || e?.response?.status;
  const code: string | undefined = e?.code || e?.error?.code;
  const message: string = String(e?.message || e?.error?.message || '').toLowerCase();

  if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) return true;
  if (code && ['rate_limit_exceeded', 'insufficient_quota', 'server_error', 'service_unavailable', 'overloaded'].includes(code)) return true;
  if (
    message.includes('rate limit') ||
    message.includes('overloaded') ||
    message.includes('temporarily unavailable') ||
    message.includes('connection error') ||
    message.includes('econnreset') ||
    message.includes('etimedout') ||
    message.includes('socket hang up')
  ) return true;
  return false;
}

interface LLMResult { content: string; provider: 'openai' | 'anthropic' }

interface LLMChatOptions {
  systemPrompt: string;
  userPrompt: string;
  openaiModel: string;
  temperature?: number;
  maxTokens?: number;
  forceJson?: boolean;
}

/**
 * Single entry point for OpenAI calls with automatic Anthropic Claude fallback
 * if OpenAI fails (rate limits, downtime, server errors).
 */
async function callLLMWithFallback(opts: LLMChatOptions): Promise<LLMResult> {
  const {
    systemPrompt,
    userPrompt,
    openaiModel,
    temperature = 0.7,
    maxTokens = 2000,
    forceJson = false,
  } = opts;

  try {
    console.log(`🤖 Appel OpenAI (${openaiModel}) en cours...`);
    const completion = await getOpenAIClient().chat.completions.create({
      model: openaiModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
      ...(forceJson ? { response_format: { type: 'json_object' as const } } : {}),
    });
    console.log('✅ Réponse OpenAI reçue');
    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('No content received from OpenAI');
    return { content, provider: 'openai' };
  } catch (openaiError) {
    const fallback = shouldFallbackToClaude(openaiError);
    console.error(`❌ Erreur OpenAI (fallback Claude = ${fallback}):`, (openaiError as any)?.message || openaiError);

    if (!fallback) throw openaiError;

    const claude = getAnthropicClient();
    if (!claude) {
      console.error('⚠️ ANTHROPIC_API_KEY non configurée — impossible de basculer vers Claude');
      throw openaiError;
    }

    const claudeSystem = forceJson
      ? `${systemPrompt}\n\nIMPORTANT: Respond with VALID JSON ONLY, no markdown, no commentary.`
      : systemPrompt;

    let lastClaudeError: unknown = openaiError;
    for (const modelId of ANTHROPIC_MODEL_CANDIDATES) {
      try {
        console.log(`🤖 Fallback vers Anthropic Claude (${modelId})...`);
        const response = await claude.messages.create({
          model: modelId,
          max_tokens: maxTokens,
          temperature,
          system: claudeSystem,
          messages: [{ role: 'user', content: userPrompt }],
        });

        console.log(`✅ Réponse Claude reçue (${modelId})`);
        const textBlock = response.content.find((b: any) => b.type === 'text') as any;
        const content = textBlock?.text || '';
        if (!content) throw new Error('No content received from Claude fallback');
        return { content, provider: 'anthropic' };
      } catch (claudeErr) {
        lastClaudeError = claudeErr;
        if (isAnthropicModelNotFound(claudeErr)) {
          console.warn(`⚠️ Modèle Claude introuvable (${modelId}), essai suivant...`);
          continue;
        }
        throw claudeErr;
      }
    }

    console.error('❌ Tous les modèles Claude ont échoué:', (lastClaudeError as any)?.message || lastClaudeError);
    throw lastClaudeError;
  }
}

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
  "Agent Senior",
  "Agent",
  "Agent Junior",
];

export class AIService {
  private static isValidApiKey(): boolean {
    const key = process.env.OPENAI_API_KEY;
    return !!(key && key !== 'your_openai_api_key_here' && key.startsWith('sk-'));
  }

  /** Extract a 24-char MongoDB ObjectId from string, { $oid }, { _id }, or array */
  private static extractMongoId(value: unknown): string | null {
    if (value == null) return null;

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (/^[0-9a-fA-F]{24}$/.test(trimmed)) return trimmed;
      return null;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const id = this.extractMongoId(item);
        if (id) return id;
      }
      return null;
    }

    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      if (obj.$oid != null) return this.extractMongoId(obj.$oid);
      if (obj._id != null) return this.extractMongoId(obj._id);
    }

    return null;
  }

  private static getCountryCommonName(country: any): string {
    return country?.name?.common || '';
  }

  private static getEntityLabel(entity: any): string {
    if (!entity) return '';
    if (typeof entity === 'string') return entity;
    if (typeof entity.name === 'string') return entity.name;
    if (entity.name?.common) return entity.name.common;
    return String(entity.code || '');
  }

  /** Primary IANA timezone per country (cca2 → zone name) */
  private static readonly COUNTRY_TIMEZONE_MAP: Record<string, string> = {
    FR: 'Europe/Paris',
    BE: 'Europe/Brussels',
    CH: 'Europe/Zurich',
    DE: 'Europe/Berlin',
    ES: 'Europe/Madrid',
    IT: 'Europe/Rome',
    NL: 'Europe/Amsterdam',
    LU: 'Europe/Luxembourg',
    PT: 'Europe/Lisbon',
    GB: 'Europe/London',
    UK: 'Europe/London',
    IE: 'Europe/Dublin',
    SE: 'Europe/Stockholm',
    NO: 'Europe/Oslo',
    DK: 'Europe/Copenhagen',
    FI: 'Europe/Helsinki',
    PL: 'Europe/Warsaw',
    AT: 'Europe/Vienna',
    CZ: 'Europe/Prague',
    GR: 'Europe/Athens',
    RO: 'Europe/Bucharest',
    HU: 'Europe/Budapest',
    MA: 'Africa/Casablanca',
    DZ: 'Africa/Algiers',
    TN: 'Africa/Tunis',
    EG: 'Africa/Cairo',
    SN: 'Africa/Dakar',
    CI: 'Africa/Abidjan',
    NG: 'Africa/Lagos',
    KE: 'Africa/Nairobi',
    ZA: 'Africa/Johannesburg',
    US: 'America/New_York',
    CA: 'America/Toronto',
    MX: 'America/Mexico_City',
    BR: 'America/Sao_Paulo',
    AR: 'America/Argentina/Buenos_Aires',
    AU: 'Australia/Sydney',
    NZ: 'Pacific/Auckland',
    JP: 'Asia/Tokyo',
    CN: 'Asia/Shanghai',
    IN: 'Asia/Kolkata',
    SG: 'Asia/Singapore',
    AE: 'Asia/Dubai',
    SA: 'Asia/Riyadh',
    TR: 'Europe/Istanbul',
    RU: 'Europe/Moscow',
  };

  /** Pick the timezone that matches a country's primary IANA zone */
  private static findTimezoneForCountry(
    countryDoc: any,
    timezonesList: any[] | undefined
  ): string | null {
    if (!countryDoc || !timezonesList?.length) return null;
    const cca2 = String(countryDoc?.cca2 || '').toUpperCase();
    const zone = this.COUNTRY_TIMEZONE_MAP[cca2];
    if (!zone) return null;

    const match = timezonesList.find((tz) => {
      const label = tz?.name || tz?.zoneName || '';
      return label === zone;
    });
    return match ? String(match._id) : null;
  }

  private static getCountryById(countriesData: any[] | undefined, countryId: string): any | null {
    if (!countriesData?.length || !countryId) return null;
    return countriesData.find((c) => String(c?._id) === countryId) || null;
  }

  private static normalizeDestinationZone(
    rawValue: unknown,
    countriesData: any[] | undefined,
    description: string
  ): string {
    const fromMongo = this.extractMongoId(rawValue);
    if (fromMongo) return fromMongo;

    if (typeof rawValue === 'string' && rawValue.trim() && !rawValue.includes('[object')) {
      const byName = this.findCountryId(rawValue.trim(), countriesData, description);
      if (byName) return byName;
    }

    const detected = this.analyzeDescriptionForCountry(description, countriesData);
    if (detected) {
      const byContext = this.findCountryId(detected, countriesData, description);
      if (byContext) return byContext;
    }

    if (countriesData && countriesData.length > 0) {
      const france = countriesData.find((c) => c?.name?.common === 'France');
      return france?._id || countriesData[0]._id;
    }

    return '';
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
    // Prioriser EUR, USD, GBP en tête de liste pour aider l'IA
    const priorityCurrencyCodes = ['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'MAD'];
    const sortedCurrencies = currenciesData
      ? [...currenciesData].sort((a: any, b: any) => {
          const aPriority = priorityCurrencyCodes.indexOf(a.code);
          const bPriority = priorityCurrencyCodes.indexOf(b.code);
          if (aPriority !== -1 && bPriority === -1) return -1;
          if (aPriority === -1 && bPriority !== -1) return 1;
          if (aPriority !== -1 && bPriority !== -1) return aPriority - bPriority;
          return (a.code || '').localeCompare(b.code || '');
        })
      : [];

    // Inclure toutes les currencies disponibles (limité à 25 pour éviter dépassement de tokens)
    const currencyOptions = sortedCurrencies
      .slice(0, 25)
      .map((currency: any) => `${currency.code} (${currency.name}, ${currency.symbol}): ${currency._id}`)
      .join('\n');

    if (sortedCurrencies.length === 0) {
      console.warn('⚠️ Aucune devise disponible pour OpenAI - currency sera défaillant');
    } else {
      console.log(`💰 ${sortedCurrencies.length} devises envoyées au prompt (top: ${sortedCurrencies.slice(0, 3).map((c: any) => c.code).join(', ')})`);
    }

    // Prioriser les pays importants pour les gigs (France, pays francophones, Europe, etc.)
    const priorityCountries = ['France', 'Egypt', 'Belgium', 'Switzerland', 'Canada', 'Morocco', 'Tunisia', 'Algeria', 'Senegal', 'United States', 'United Kingdom', 'Germany', 'Spain', 'Italy'];
    const sortedCountries = countriesData ? [...countriesData].sort((a, b) => {
      const aName = this.getCountryCommonName(a);
      const bName = this.getCountryCommonName(b);
      const aIsPriority = priorityCountries.includes(aName);
      const bIsPriority = priorityCountries.includes(bName);
      if (aIsPriority && !bIsPriority) return -1;
      if (!aIsPriority && bIsPriority) return 1;
      return aName.localeCompare(bName);
    }) : [];

    // Limiter à 30 pays maximum pour respecter la limite de tokens OpenAI
    const countryOptions = sortedCountries.slice(0, 30).map(country => `${this.getCountryCommonName(country)}: ${country._id}`).join(', ');

    console.log(`🔍 Prompt préparé avec ${sortedCountries.length} pays (limité à 30), ${activityNames.length} activités`);
    console.log(`🔍 Première pays dans la liste: ${sortedCountries.slice(0, 5).map(c => this.getCountryCommonName(c)).join(', ')}`);

    const prompt = `Based on: "${description}"

IMPORTANT: 
- Respond in the SAME LANGUAGE as input
- For destination_zone, use EXACTLY ONE MongoDB ObjectId string from COUNTRIES list (NOT an array, NOT multiple countries)
- availability.time_zone MUST be the primary IANA timezone of the destination_zone country (France → Europe/Paris, Morocco → Africa/Casablanca, Belgium → Europe/Brussels, Canada → America/Toronto, USA → America/New_York, UK → Europe/London, Germany → Europe/Berlin, Spain → Europe/Madrid, Italy → Europe/Rome). NEVER mix a country with the timezone of a different one.
- For currency, use ONLY MongoDB ObjectId from CURRENCIES list inside the object structure
- Detect country from language/currency/context
- Use only options below:

CATEGORIES (choose the most appropriate one):
${PREDEFINED_CATEGORIES.join(', ')}

COUNTRIES — destination_zone MUST be a single ObjectId string (pick the PRIMARY target country only):
${countryOptions}

ACTIVITIES (choose the most relevant ones):
${activityNames.join(', ')}

INDUSTRIES (choose the most relevant ones):
${industriesData.map(ind => `${this.getEntityLabel(ind)}${ind.code ? ` (${ind.code})` : ''}`).join(', ')}

LANGUAGES (suggest relevant ones with proficiency levels A1-C2):
${languagesData.map(lang => `${lang.name} (${lang.iso639_1})`).join(', ')}

SOFT SKILLS (choose relevant ones with levels 1-5):
${softSkillNames.join(', ')}

PROFESSIONAL SKILLS (choose relevant ones with levels 1-5):
${professionalSkillNames.join(', ')}

TECHNICAL SKILLS (choose relevant ones with levels 1-5):
${technicalSkillNames.join(', ')}

CURRENCIES — STRICT RULE (use the EXACT MongoDB ObjectId, never the code):
The "commission.currency" field MUST be filled with the ObjectId shown after the colon below.
NEVER return the currency code (like "EUR" or "USD") as the value — always the ObjectId.
If you cannot determine a currency from the context, default to EUR.
${currencyOptions}

TEAM ROLES (choose the most appropriate ones from this list):
${TEAM_ROLES.join(', ')}

RULES:
- Same language as input
- Match country to context/language
- Days: Monday, Tuesday, etc. (no "Other days")
- Seniority: Entry Level/Junior/Mid-Level/Senior/Manager
- team.structure.roleId: MUST be one of the TEAM ROLES listed above. Analyze the description to determine appropriate roles and counts (e.g. if "needs a manager and 3 agents", return 1 Manager and 3 Agents).

COMMISSION STRUCTURE — STRICT DEFINITIONS (read carefully):
- "commission_per_call" = AMOUNT (number, in the selected currency) PAID TO THE AGENT FOR EACH SUCCESSFUL CALL THEY PERFORM.
  • Extract a real number if mentioned (e.g. "5€ par appel" → 5). 
  • DEFAULT = 2 if nothing is said.
- "transactionCommission" = AMOUNT (number) PAID TO THE AGENT FOR EACH CLOSED/COMPLETED TRANSACTION (e.g. a sale, a signed contract). Different from commission_per_call.
  • Extract real number if mentioned (e.g. "50€ par vente" → 50).
  • DEFAULT = 25 if nothing is said.
- "bonusAmount" = BONUS AMOUNT (number) PAID WHEN THE AGENT REACHES A MINIMUM VOLUME OF CALLS over a period.
  • Extract real number if mentioned (e.g. "bonus de 200€" → 200).
  • DEFAULT = 100 if nothing is said.
- "minimumVolume" describes THE NUMBER OF CALLS REQUIRED TO TRIGGER THE BONUS, OVER A PERIOD.
  • "amount" = number of calls to reach (as a string). Extract from text (e.g. "100 calls/month" → "100"). DEFAULT = "50".
  • "period" = "Daily" | "Weekly" | "Monthly". Detect from context. DEFAULT = "Monthly".
  • "unit" = "Calls" | "Transactions". Choose what's mentioned. DEFAULT = "Calls".
- "currency" MUST be a real MongoDB ObjectId from the CURRENCIES list, in the object form { "$oid": "..." }. DEFAULT = EUR ObjectId.
- "additionalDetails" = short paragraph (2-3 sentences) summarising payment frequency (weekly/monthly), how the bonus triggers, and any special clauses. SAME LANGUAGE AS INPUT.

EXAMPLES:
- "Pay 5€ per call + 50€ per sale, bonus 200€ if 100 calls per month" →
  commission_per_call: 5, transactionCommission: 50, bonusAmount: 200,
  minimumVolume: { amount: "100", period: "Monthly", unit: "Calls" }
- "10$ per call, 5 calls per day bonus 30$" →
  commission_per_call: 10, transactionCommission: 25 (default), bonusAmount: 30,
  minimumVolume: { amount: "5", period: "Daily", unit: "Calls" }
- Nothing specified about commission → use ALL defaults above.

JSON format:
{
  "jobTitles": ["Main job title suggestion (SAME LANGUAGE AS USER QUERY)", "Alternative job title (SAME LANGUAGE AS USER QUERY)", "Another option (SAME LANGUAGE AS USER QUERY)"],
  "jobDescription": "Enhanced description (IN SAME LANGUAGE AS USER QUERY)",
  "highlights": ["Key selling point 1 (SAME LANGUAGE AS USER QUERY)", "Key selling point 2 (SAME LANGUAGE AS USER QUERY)", "Key selling point 3 (SAME LANGUAGE AS USER QUERY)"],
  "deliverables": ["Expected outcome 1 (SAME LANGUAGE AS USER QUERY)", "Expected outcome 2 (SAME LANGUAGE AS USER QUERY)", "Expected outcome 3 (SAME LANGUAGE AS USER QUERY)"],
  "category": "One of the predefined categories above",
  "destination_zone": "SINGLE_MONGODB_OBJECTID_STRING_FROM_COUNTRIES_LIST",
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
    "commission_per_call": 2,
    "transactionCommission": 25,
    "bonusAmount": 100,
    "currency": {
      "$oid": "MONGODB_OBJECTID_FROM_CURRENCIES_LIST"
    },
    "minimumVolume": {
      "amount": "50",
      "period": "Monthly",
      "unit": "Calls"
    },
    "additionalDetails": "Comprehensive 2-3 sentence summary in the SAME LANGUAGE as input: include per-call pay, per-transaction commission, bonus trigger (X calls per day/week/month) and payment frequency (weekly/monthly)."
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
      const { content } = await callLLMWithFallback({
        systemPrompt:
          'You are a helpful assistant that creates comprehensive gig listings. IMPORTANT: All responses MUST be in English only. Return only valid JSON.',
        userPrompt: prompt,
        openaiModel: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2000,
        forceJson: true,
      });

      try {
        const parsedResponse = this.parseOpenAIResponse(content);

        const rawDestinationZone = parsedResponse.destination_zone;
        parsedResponse.destination_zone = this.normalizeDestinationZone(
          rawDestinationZone,
          countriesData,
          description
        );
        console.log(`🔍 destination_zone normalisé: ${parsedResponse.destination_zone || '(vide)'}`);
        if (Array.isArray(rawDestinationZone)) {
          console.log(`⚠️ OpenAI a renvoyé un tableau destination_zone — premier pays conservé`);
        }

        // Valider et corriger la catégorie
        if (parsedResponse.category) {
          parsedResponse.category = this.findBestCategory(parsedResponse.category);
        } else {
          parsedResponse.category = 'Customer Service'; // Default
        }

        // Convertir les activités en IDs
        if (parsedResponse.activities) {
          parsedResponse.activities = parsedResponse.activities.map((activityName: any) => {
            const existingId = this.extractMongoId(activityName);
            if (existingId) return existingId;
            return this.findActivityId(this.getEntityLabel(activityName), activitiesData);
          });
        }

        // Convertir les industries en IDs
        if (parsedResponse.industries) {
          parsedResponse.industries = parsedResponse.industries.map((industryName: any) => {
            const existingId = this.extractMongoId(industryName);
            if (existingId) return existingId;
            return this.findIndustryId(this.getEntityLabel(industryName), industriesData);
          });
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

          // 2. Strict type enforcement + defaults for commission fields
          // Defaults (used only when AI returned 0/null/missing):
          //   commission_per_call: 2   (per successful call)
          //   transactionCommission: 25 (per closed transaction)
          //   bonusAmount: 100         (bonus when minimumVolume reached)
          //   minimumVolume: 50 Calls / Monthly

          const toNumber = (val: any): number =>
            typeof val === 'string' ? (parseFloat(val) || 0) : (typeof val === 'number' ? val : 0);

          const parsedPerCall = toNumber(
            parsedResponse.commission.commission_per_call ?? parsedResponse.commission.commissionPerCall
          );
          parsedResponse.commission.commission_per_call = parsedPerCall > 0 ? parsedPerCall : 2;
          delete parsedResponse.commission.commissionPerCall;

          const parsedTransComm = toNumber(parsedResponse.commission.transactionCommission);
          parsedResponse.commission.transactionCommission = parsedTransComm > 0 ? parsedTransComm : 25;

          const parsedBonus = toNumber(parsedResponse.commission.bonusAmount);
          parsedResponse.commission.bonusAmount = parsedBonus > 0 ? parsedBonus : 100;

          // minimumVolume — with defaults
          if (parsedResponse.commission.minimumVolume) {
            const amtRaw = parsedResponse.commission.minimumVolume.amount;
            const amtNum = toNumber(amtRaw);
            parsedResponse.commission.minimumVolume.amount = amtNum > 0 ? String(amtNum) : "50";
            parsedResponse.commission.minimumVolume.unit = parsedResponse.commission.minimumVolume.unit || "Calls";
            parsedResponse.commission.minimumVolume.period = parsedResponse.commission.minimumVolume.period || "Monthly";
          } else {
            parsedResponse.commission.minimumVolume = {
              amount: "50",
              period: "Monthly",
              unit: "Calls"
            };
          }

          // additionalDetails must be string
          parsedResponse.commission.additionalDetails = parsedResponse.commission.additionalDetails || "";
        }

        // Convertir les timezones en IDs avec contexte intelligent
        const timezoneContext = `${parsedResponse.title || ''} ${parsedResponse.description || ''} ${description}`;

        // STEP 1: Determine the timezone that MUST be used = primary TZ of destination_zone country
        const destinationCountry = this.getCountryById(countriesData, parsedResponse.destination_zone);
        const destinationCountryName = destinationCountry ? this.getCountryCommonName(destinationCountry) : '';
        const destinationCca2 = destinationCountry?.cca2 || '';
        const enforcedTimezoneId = this.findTimezoneForCountry(destinationCountry, timezonesData);
        const enforcedTimezoneName = destinationCca2
          ? this.COUNTRY_TIMEZONE_MAP[String(destinationCca2).toUpperCase()] || ''
          : '';

        if (enforcedTimezoneId) {
          console.log(`🕒 TIMEZONE ENFORCED from destination "${destinationCountryName}" (${destinationCca2}) → ${enforcedTimezoneName} (${enforcedTimezoneId})`);
        } else if (destinationCountryName) {
          console.warn(`⚠️ Aucune timezone enregistrée pour le pays "${destinationCountryName}" (${destinationCca2})`);
        }

        // Gérer l'ancien format (schedule.schedules) pour rétrocompatibilité
        if (parsedResponse.schedule?.schedules && timezonesData) {
          parsedResponse.schedule.schedules = parsedResponse.schedule.schedules.map((schedule: any) => ({
            ...schedule,
            timezone:
              enforcedTimezoneId ||
              this.findTimezoneId(schedule.timezone || 'UTC', timezonesData, timezoneContext),
          }));
        }

        // Gérer le nouveau format (availability.time_zone)
        if (parsedResponse.availability && timezonesData) {
          const originalTimezoneName = parsedResponse.availability.time_zone;
          const timezoneId =
            enforcedTimezoneId ||
            (originalTimezoneName
              ? this.findTimezoneId(originalTimezoneName, timezonesData, timezoneContext)
              : null);

          if (timezoneId) {
            parsedResponse.availability.time_zone = timezoneId;
          }

          // Mettre à jour la currency en se basant sur le NOM IANA de la timezone forcée
          const tzNameForCurrency = enforcedTimezoneName || originalTimezoneName || '';
          if (parsedResponse.commission && currenciesData && currenciesData.length > 0 && tzNameForCurrency) {
            const currencyCode = this.getCurrencyFromTimezone(tzNameForCurrency);
            const currencyId = this.findCurrencyId(currencyCode, currenciesData);
            parsedResponse.commission.currency = { $oid: currencyId };
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
      const { content } = await callLLMWithFallback({
        systemPrompt:
          'You are a helpful assistant that suggests relevant skills for job positions. IMPORTANT: All responses MUST be in English only. Return only valid JSON.',
        userPrompt: prompt,
        openaiModel: 'gpt-4',
        temperature: 0.7,
        maxTokens: 1000,
        forceJson: true,
      });

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
      const { content } = await callLLMWithFallback({
        systemPrompt:
          'You are a helpful assistant that provides timezone and scheduling recommendations for global business operations. IMPORTANT: All responses MUST be in English only.',
        userPrompt: prompt,
        openaiModel: 'gpt-4',
        temperature: 0.7,
        maxTokens: 500,
        forceJson: true,
      });

      try {
        return this.parseOpenAIResponse(content);
      } catch (error) {
        console.error('Error parsing AI response:', error);
        console.error('Raw response:', content);
        throw new Error('Invalid response format from AI');
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
      const { content } = await callLLMWithFallback({
        systemPrompt:
          'You are a helpful assistant that suggests appropriate destination zones for job postings based on the job details provided. IMPORTANT: All responses MUST be in English only.',
        userPrompt: prompt,
        openaiModel: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 200,
        forceJson: true,
      });

      try {
        return this.parseOpenAIResponse(content);
      } catch (error) {
        console.error('Error parsing AI response:', error);
        console.error('Raw response:', content);
        throw new Error('Invalid response format from AI');
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
    if (!activityName?.trim() || !activitiesList?.length) {
      return activitiesList?.[0]?._id || 'unknown-activity-id';
    }

    const safeName = (a: any) => (typeof a?.name === 'string' ? a.name : '');

    // Recherche exacte d'abord
    let activity = activitiesList.find(a => safeName(a).toLowerCase() === activityName.toLowerCase());
    if (activity) {
      return activity._id;
    }

    // Recherche approximative si pas de correspondance exacte
    const normalizedSearchName = activityName.toLowerCase().trim();

    // Essayer de trouver une correspondance partielle
    activity = activitiesList.find(a => {
      const normalizedActivityName = safeName(a).toLowerCase().trim();
      if (!normalizedActivityName) return false;
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
      activity = activitiesList.find(a => safeName(a).toLowerCase() === mappedName.toLowerCase());
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
    if (!industryName?.trim() || !industriesList?.length) {
      return industriesList?.[0]?._id || 'unknown-industry-id';
    }

    const safeName = (i: any) => (typeof i?.name === 'string' ? i.name : '');

    // Recherche exacte d'abord
    let industry = industriesList.find(i => safeName(i).toLowerCase() === industryName.toLowerCase());
    if (industry) {
      return industry._id;
    }

    // Recherche approximative si pas de correspondance exacte
    const normalizedSearchName = industryName.toLowerCase().trim();

    // Essayer de trouver une correspondance partielle
    industry = industriesList.find(i => {
      const normalizedIndustryName = safeName(i).toLowerCase().trim();
      if (!normalizedIndustryName) return false;
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

    const tzLabel = (tz: any) => tz.zoneName || tz.name || '';

    // Recherche exacte par nom IANA (zoneName ou name depuis MongoDB)
    let timezone = timezonesList.find(tz => tzLabel(tz) === timezoneName);
    if (timezone) return timezone._id;

    // Analyse contextuelle pour déterminer la région probable
    const contextualMapping = this.getContextualTimezone(context || '', timezonesList, undefined);
    if (contextualMapping) return contextualMapping;

    // Recherche par nom de pays ou zone
    timezone = timezonesList.find(tz => {
      const label = tzLabel(tz).toLowerCase();
      return tz.countryName?.toLowerCase().includes(timezoneName.toLowerCase()) ||
        label.includes(timezoneName.toLowerCase());
    });
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
      timezone = timezonesList.find(tz => tzLabel(tz) === mappedZone);
      if (timezone) return timezone._id;
    }

    // Fallback intelligent basé sur le contexte
    timezone = timezonesList.find(tz => tzLabel(tz) === 'Europe/Paris') ||
      timezonesList.find(tz => tzLabel(tz) === 'UTC') ||
      timezonesList.find(tz => tzLabel(tz).includes('UTC')) ||
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
