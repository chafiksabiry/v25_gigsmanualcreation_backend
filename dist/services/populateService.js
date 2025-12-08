"use strict";
// Service pour populer les données avec les détails complets depuis l'API externe
Object.defineProperty(exports, "__esModule", { value: true });
exports.PopulateService = void 0;
const EXTERNAL_API_BASE = process.env.REP_URL || 'https://api-repcreationwizard.harx.ai/api';
class PopulateService {
    /**
     * Populate un objet gig avec les détails complets
     */
    static async populateGigData(gigData, options = {}) {
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
        }
        catch (error) {
            console.error('Error populating gig data:', error);
            return gigData; // Return original data if populate fails
        }
    }
    /**
     * Populate activities with full details
     */
    static async populateActivities(activityIds) {
        try {
            const response = await fetch(`${EXTERNAL_API_BASE}/activities`);
            const data = await response.json();
            if (!data.success)
                return activityIds.map(id => ({ _id: id, name: 'Unknown Activity', description: '', category: '', isActive: true }));
            return activityIds.map(id => {
                const activity = data.data.find((a) => a._id === id);
                return activity || { _id: id, name: 'Unknown Activity', description: '', category: '', isActive: true };
            });
        }
        catch (error) {
            console.error('Error populating activities:', error);
            return activityIds.map(id => ({ _id: id, name: 'Unknown Activity', description: '', category: '', isActive: true }));
        }
    }
    /**
     * Populate industries with full details
     */
    static async populateIndustries(industryIds) {
        try {
            const response = await fetch(`${EXTERNAL_API_BASE}/industries`);
            const data = await response.json();
            if (!data.success)
                return industryIds.map(id => ({ _id: id, name: 'Unknown Industry', description: '', isActive: true }));
            return industryIds.map(id => {
                const industry = data.data.find((i) => i._id === id);
                return industry || { _id: id, name: 'Unknown Industry', description: '', isActive: true };
            });
        }
        catch (error) {
            console.error('Error populating industries:', error);
            return industryIds.map(id => ({ _id: id, name: 'Unknown Industry', description: '', isActive: true }));
        }
    }
    /**
     * Populate languages with full details
     */
    static async populateLanguages(languageData) {
        try {
            const response = await fetch(`${EXTERNAL_API_BASE}/languages`);
            const data = await response.json();
            if (!data.success)
                return languageData;
            return languageData.map(langData => {
                const language = data.data.find((l) => l._id === langData.language);
                return {
                    ...langData,
                    languageDetails: language || { _id: langData.language, name: 'Unknown Language', code: '', nativeName: '' }
                };
            });
        }
        catch (error) {
            console.error('Error populating languages:', error);
            return languageData;
        }
    }
    /**
     * Populate skills with full details
     */
    static async populateSkills(skillsData, skillType) {
        try {
            const response = await fetch(`${EXTERNAL_API_BASE}/skills/${skillType}`);
            const data = await response.json();
            if (!data.success)
                return skillsData;
            return skillsData.map(skillData => {
                const skill = data.data.find((s) => s._id === skillData.skill);
                return {
                    ...skillData,
                    skillDetails: skill || { _id: skillData.skill, name: 'Unknown Skill', description: '', category: '', isActive: true }
                };
            });
        }
        catch (error) {
            console.error(`Error populating ${skillType} skills:`, error);
            return skillsData;
        }
    }
    /**
     * Endpoint pour récupérer des données populées
     */
    static async getPopulatedGig(gigId, options = {}) {
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
exports.PopulateService = PopulateService;
