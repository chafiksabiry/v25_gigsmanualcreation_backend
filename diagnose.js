
const mongoose = require('mongoose');

// Correct URI provided by user
const mongoUri = 'mongodb://mongo:DiGaBWUZXCkIxlZMuntztBaFJcOlUJIg@maglev.proxy.rlwy.net:40270/harx?authSource=admin';

async function diagnose() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('Successfully connected to MongoDB');

        // We use the raw connection to check collections since we don't want to load models in JS (requires transpilation)
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections:', collections.map(c => c.name));

        const countryCollection = mongoose.connection.db.collection('countries');
        const currencyCollection = mongoose.connection.db.collection('currencies');
        const timezoneCollection = mongoose.connection.db.collection('timezones');

        const countryCount = await countryCollection.countDocuments();
        const currencyCount = await currencyCollection.countDocuments();
        const timezoneCount = await timezoneCollection.countDocuments();

        console.log(`Countries in DB: ${countryCount}`);
        console.log(`Currencies in DB: ${currencyCount}`);
        console.log(`Timezones in DB: ${timezoneCount}`);

        if (countryCount > 0) {
            const sample = await countryCollection.findOne();
            console.log('Sample Country:', JSON.stringify(sample, null, 2));
        }

        if (currencyCount > 0) {
            const sample = await currencyCollection.findOne();
            console.log('Sample Currency:', JSON.stringify(sample, null, 2));

            const targetId = "68cae8918f8bb2a31a09b79f";
            const targetCurrency = await currencyCollection.findOne({ _id: new mongoose.Types.ObjectId(targetId) });
            if (targetCurrency) {
                console.log(`Found currency for ID ${targetId}:`, JSON.stringify(targetCurrency, null, 2));
            } else {
                console.log(`Currency with ID ${targetId} NOT found in DB.`);
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('Diagnosis failed:', error);
        process.exit(1);
    }
}

diagnose();
