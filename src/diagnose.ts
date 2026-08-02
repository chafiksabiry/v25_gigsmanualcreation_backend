
import mongoose from 'mongoose';
import { Country } from './models/countryModel';
import { Currency } from './models/currencyModel';
import dotenv from 'dotenv';

dotenv.config();

const mongoUri = process.env.MONGO_URI || 'mongodb://harx:gcZ62rl8hoME@38.242.208.242:27018/V25_CompanySearchWizard';

async function diagnose() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('Successfully connected to MongoDB');

        const countryCount = await Country.countDocuments();
        const currencyCount = await Currency.countDocuments();

        console.log(`Countries in DB: ${countryCount}`);
        console.log(`Currencies in DB: ${currencyCount}`);

        if (countryCount > 0) {
            const sampleCountry = await Country.findOne();
            console.log('Sample Country:', JSON.stringify(sampleCountry, null, 2));
        }

        if (currencyCount > 0) {
            const sampleCurrency = await Currency.findOne();
            console.log('Sample Currency:', JSON.stringify(sampleCurrency, null, 2));
        }

        process.exit(0);
    } catch (error) {
        console.error('Diagnosis failed:', error);
        process.exit(1);
    }
}

diagnose();
