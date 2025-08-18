import { GigService } from '../services/gigService';
import mongoose from 'mongoose';

async function testGetAllGigsWithPopulate() {
  try {
    console.log('Testing getAllGigs with populate...');
    
    // Test de la méthode getAllGigs avec populate
    const gigs = await GigService.getAllGigs();
    
    console.log('✅ getAllGigs with populate successful!');
    console.log(`Found ${gigs.length} gigs`);
    
    if (gigs.length > 0) {
      const firstGig = gigs[0];
      console.log('Sample gig structure:');
      console.log('- activities populated:', Array.isArray(firstGig.activities));
      console.log('- industries populated:', Array.isArray(firstGig.industries));
      console.log('- userId populated:', !!firstGig.userId);
      console.log('- companyId populated:', !!firstGig.companyId);
      
      if (firstGig.skills) {
        console.log('- skills.professional populated:', Array.isArray(firstGig.skills.professional));
        console.log('- skills.technical populated:', Array.isArray(firstGig.skills.technical));
        console.log('- skills.soft populated:', Array.isArray(firstGig.skills.soft));
        console.log('- skills.languages populated:', Array.isArray(firstGig.skills.languages));
      }
      
      if (firstGig.availability) {
        console.log('- availability.time_zone populated:', !!firstGig.availability.time_zone);
      }
    }
    
  } catch (error) {
    console.error('❌ Error in testGetAllGigsWithPopulate:', error);
  }
}

export { testGetAllGigsWithPopulate };