import express, { Application } from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import cors from 'cors';
import gigRoutes from './route/gigRoute';
import aiRoutes from './route/aiRoute';
import countryRoutes from './route/countryRoute';
import currencyRoutes from './route/currencyRoute';
import sectorRoutes from './route/sectorRoute';
import bulkRoutes from './route/bulkRoute';

dotenv.config();  // Pour charger les variables d'environnement depuis un fichier .env

const app: Application = express();
const port = process.env.PORT || 5003;

// CORS configuration
const corsOptions = {
  origin: [
    'https://harx25pageslinks.netlify.app',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'http://localhost:5179',
    'http://localhost:5183',
    'https://harxv25copilotfrontend.netlify.app',
    "http://localhost:5190",
    "https://harxv25trainingplatformfrontend.netlify.app",
    'https://v25.harx.ai'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'X-File-Name'
  ],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  preflightContinue: false,
  optionsSuccessStatus: 200
};

// Middleware CORS manuel (backup)
app.use((req, res, next) => {
  const allowedOrigins = [
    'https://harx25pageslinks.netlify.app',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'http://localhost:5179',
    'http://localhost:5183',
    'https://harxv25copilotfrontend.netlify.app',
    'http://localhost:5190',
    'https://harxv25trainingplatformfrontend.netlify.app',
    'https://v25.harx.ai'
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin as string)) {
    res.setHeader('Access-Control-Allow-Origin', origin as string);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, X-File-Name');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
});

// Middleware pour parser le corps des requêtes en JSON avec limite augmentée
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(cors(corsOptions));

// Connexion à MongoDB
const mongoUri = process.env.MONGO_URI || 'mongodb://harx:gcZ62rl8hoME@38.242.208.242:27018/V25_CompanySearchWizard';

mongoose.connect(mongoUri)
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

// Utilisation des routes pour les devises
app.use('/api/currencies', currencyRoutes);

// Utilisation des routes pour les secteurs
app.use('/api/sectors', sectorRoutes);

// Utilisation des routes pour le traitement en bulk
app.use('/api/bulk', bulkRoutes);

// Route de base
app.get('/', (req, res) => {
  res.send('Hello, welcome to the Gig API');
});

// Démarrer le serveur
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
