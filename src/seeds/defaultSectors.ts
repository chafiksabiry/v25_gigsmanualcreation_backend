import { Sector } from '../models/sectorModel';

/** Same list and labels as v25_repscreationwizard_backend (seedSectors), i.e. the AI categories. */
const DEFAULT_SECTORS: Array<{ en: string; fr: string; descEn: string; descFr: string }> = [
  { en: "Inbound Sales", fr: "Vente entrante", descEn: "Inbound sales calls", descFr: "Appels de vente entrants" },
  { en: "Outbound Sales", fr: "Vente sortante", descEn: "Outbound sales calls", descFr: "Appels de vente sortants" },
  { en: "Customer Service", fr: "Service client", descEn: "Customer service", descFr: "Service client" },
  { en: "Technical Support", fr: "Support technique", descEn: "Technical support", descFr: "Support technique" },
  { en: "Account Management", fr: "Gestion de compte", descEn: "Account management", descFr: "Gestion de compte" },
  { en: "Lead Generation", fr: "Génération de leads", descEn: "Lead generation", descFr: "Génération de leads" },
  { en: "Market Research", fr: "Études de marché", descEn: "Market research", descFr: "Études de marché" },
  { en: "Appointment Setting", fr: "Prise de rendez-vous", descEn: "Appointment setting", descFr: "Prise de rendez-vous" },
  { en: "Order Processing", fr: "Traitement des commandes", descEn: "Order processing", descFr: "Traitement des commandes" },
  { en: "Customer Retention", fr: "Fidélisation client", descEn: "Customer retention", descFr: "Fidélisation client" },
  { en: "Billing Support", fr: "Support facturation", descEn: "Billing support", descFr: "Support facturation" },
  { en: "Product Support", fr: "Support produit", descEn: "Product support", descFr: "Support produit" },
  { en: "Help Desk", fr: "Help desk", descEn: "Help desk", descFr: "Help desk" },
  { en: "Chat Support", fr: "Support chat", descEn: "Chat support", descFr: "Support chat" },
  { en: "Email Support", fr: "Support e-mail", descEn: "Email support", descFr: "Support e-mail" },
  { en: "Social Media Support", fr: "Support réseaux sociaux", descEn: "Social media support", descFr: "Support réseaux sociaux" },
  { en: "Survey Calls", fr: "Appels d’enquête", descEn: "Survey calls", descFr: "Appels d’enquête" },
  { en: "Welcome Calls", fr: "Appels de bienvenue", descEn: "Welcome calls", descFr: "Appels de bienvenue" },
  { en: "Follow-up Calls", fr: "Appels de suivi", descEn: "Follow-up calls", descFr: "Appels de suivi" },
  { en: "Complaint Resolution", fr: "Traitement des réclamations", descEn: "Complaint resolution", descFr: "Traitement des réclamations" },
  { en: "Warranty Support", fr: "Support garantie", descEn: "Warranty support", descFr: "Support garantie" },
  { en: "Collections", fr: "Recouvrement", descEn: "Collections", descFr: "Recouvrement" },
  { en: "Dispatch Services", fr: "Services de dispatch", descEn: "Dispatch services", descFr: "Services de dispatch" },
  { en: "Emergency Support", fr: "Support d’urgence", descEn: "Emergency support", descFr: "Support d’urgence" },
  { en: "Multilingual Support", fr: "Support multilingue", descEn: "Multilingual support", descFr: "Support multilingue" },
];

/** Inserts the missing default sectors; never touches existing ones. */
export async function seedDefaultSectors(): Promise<number> {
  const result = await Sector.bulkWrite(
    DEFAULT_SECTORS.map(({ en, fr, descEn, descFr }) => ({
      updateOne: {
        filter: { name: en },
        update: {
          $setOnInsert: { name: en, description: descEn, name_i18n: { en, fr }, description_i18n: { en: descEn, fr: descFr } },
        },
        upsert: true,
      },
    }))
  );
  return result.upsertedCount;
}
