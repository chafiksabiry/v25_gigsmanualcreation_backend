"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const countryModel_1 = require("./models/countryModel");
const currencyModel_1 = require("./models/currencyModel");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const mongoUri = process.env.MONGO_URI || 'mongodb://harx:gcZ62rl8hoME@38.242.208.242:27018/V25_CompanySearchWizard';
async function diagnose() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose_1.default.connect(mongoUri);
        console.log('Successfully connected to MongoDB');
        const countryCount = await countryModel_1.Country.countDocuments();
        const currencyCount = await currencyModel_1.Currency.countDocuments();
        console.log(`Countries in DB: ${countryCount}`);
        console.log(`Currencies in DB: ${currencyCount}`);
        if (countryCount > 0) {
            const sampleCountry = await countryModel_1.Country.findOne();
            console.log('Sample Country:', JSON.stringify(sampleCountry, null, 2));
        }
        if (currencyCount > 0) {
            const sampleCurrency = await currencyModel_1.Currency.findOne();
            console.log('Sample Currency:', JSON.stringify(sampleCurrency, null, 2));
        }
        process.exit(0);
    }
    catch (error) {
        console.error('Diagnosis failed:', error);
        process.exit(1);
    }
}
diagnose();
