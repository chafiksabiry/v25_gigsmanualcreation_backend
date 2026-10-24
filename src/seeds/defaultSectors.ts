import { Sector } from '../models/sectorModel';

/** Same list as the AI categories (aiService PREDEFINED_CATEGORIES), with French labels. */
const DEFAULT_SECTORS: Array<{ en: string; fr: string }> = [
  { en: 'Inbound Sales', fr: 'Ventes entrantes' },
  { en: 'Outbound Sales', fr: 'Ventes sortantes' },
  { en: 'Customer Service', fr: 'Service client' },
  { en: 'Technical Support', fr: 'Support technique' },
  { en: 'Account Management', fr: 'Gestion de comptes' },
  { en: 'Lead Generation', fr: 'Génération de leads' },
  { en: 'Market Research', fr: 'Études de marché' },
  { en: 'Appointment Setting', fr: 'Prise de rendez-vous' },
  { en: 'Order Processing', fr: 'Traitement de commandes' },
  { en: 'Customer Retention', fr: 'Fidélisation client' },
  { en: 'Billing Support', fr: 'Support facturation' },
  { en: 'Product Support', fr: 'Support produit' },
  { en: 'Help Desk', fr: 'Help desk' },
  { en: 'Chat Support', fr: 'Support par chat' },
  { en: 'Email Support', fr: 'Support par e-mail' },
  { en: 'Social Media Support', fr: 'Support réseaux sociaux' },
  { en: 'Survey Calls', fr: "Appels d'enquête" },
  { en: 'Welcome Calls', fr: "Appels de bienvenue" },
  { en: 'Follow-up Calls', fr: 'Appels de suivi' },
  { en: 'Complaint Resolution', fr: 'Gestion des réclamations' },
  { en: 'Warranty Support', fr: 'Support garantie' },
  { en: 'Collections', fr: 'Recouvrement' },
  { en: 'Dispatch Services', fr: 'Services de dispatch' },
  { en: 'Emergency Support', fr: "Support d'urgence" },
  { en: 'Multilingual Support', fr: 'Support multilingue' },
];

/** Inserts the missing default sectors; never touches existing ones. */
export async function seedDefaultSectors(): Promise<number> {
  const result = await Sector.bulkWrite(
    DEFAULT_SECTORS.map(({ en, fr }) => ({
      updateOne: {
        filter: { name: en },
        update: {
          $setOnInsert: { name: en, description: en, name_i18n: { en, fr }, description_i18n: { en, fr } },
        },
        upsert: true,
      },
    }))
  );
  return result.upsertedCount;
}
