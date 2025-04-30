import { GigService } from '../services/gigService';

async function testCreateGig() {
  try {
    const gigData = {
      title: "Développeur Full Stack",
      description: "Recherche d'un développeur full stack expérimenté",
      category: "Développement",
      destination_zone: ["Europe", "Amérique du Nord"],
      seniority: {
        level: "Senior",
        yearsExperience: "5+"
      },
      skills: {
        professional: ["Gestion de projet", "Agile"],
        technical: ["JavaScript", "Node.js", "React"],
        soft: ["Communication", "Leadership"],
        languages: [
          {
            name: "Anglais",
            level: "Courant"
          }
        ]
      }
    };

    const newGig = await GigService.createGig(gigData);
    console.log('Gig créé avec succès:', newGig);
  } catch (error) {
    console.error('Erreur lors de la création du gig:', error);
  }
}

testCreateGig(); 