import express, { Application } from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import gigRoutes from './route/gigRoute';
import cors from "cors";

dotenv.config();  // Pour charger les variables d'environnement depuis un fichier .env

const app: Application = express();
const port = process.env.PORT || 5003;

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

// Middleware pour parser le corps des requêtes en JSON
app.use(bodyParser.json());
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

// Route de base
app.get('/', (req, res) => {
  res.send('Hello, welcome to the Gig API');
});

// Démarrer le serveur
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
