import express, { Application } from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import cors from 'cors';
import gigRoutes from './route/gigRoute';
import aiRoutes from './route/aiRoute';
import countryRoutes from './route/countryRoute';

dotenv.config();  // Pour charger les variables d'environnement depuis un fichier .env

const app: Application = express();
const port = process.env.PORT || 5005;

// CORS configuration
const corsOptions = {
  origin: [
    'https://v25.harx.ai',
    'https://v25-preprod.harx.ai',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'http://localhost:5179',
    'http://localhost:5183',
    'https://copilot.harx.ai'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Middleware pour parser le corps des requêtes en JSON avec limite augmentée
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(cors(corsOptions));

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI as string)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  });

// Utilisation des routes pour les gig
app.use('/api/gigs', gigRoutes);

// Utilisation des routes pour l'IA
app.use('/api/ai', aiRoutes);

// Utilisation des routes pour les pays
app.use('/api/countries', countryRoutes);

// Route de base
app.get('/', (req, res) => {
  res.send('Hello, welcome to the Gig API');
});

// Démarrer le serveur
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
