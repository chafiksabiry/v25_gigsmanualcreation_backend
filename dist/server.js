"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const gigRoute_1 = __importDefault(require("./route/gigRoute"));
const aiRoute_1 = __importDefault(require("./route/aiRoute"));
const countryRoute_1 = __importDefault(require("./route/countryRoute"));
const currencyRoute_1 = __importDefault(require("./route/currencyRoute"));
const bulkRoute_1 = __importDefault(require("./route/bulkRoute"));
dotenv_1.default.config(); // Pour charger les variables d'environnement depuis un fichier .env
const app = (0, express_1.default)();
const port = process.env.PORT || 5003;
// CORS configuration
const corsOptions = {
    origin: [
        'https://v25.harx.ai',
        'https://v25-prod.harx.ai',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5173',
        'http://localhost:5179',
        'http://localhost:5183',
        'https://copilot.harx.ai'
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
        'https://v25.harx.ai',
        'https://v25-prod.harx.ai',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5173',
        'http://localhost:5179',
        'http://localhost:5183',
        'https://copilot.harx.ai'
    ];
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
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
app.use(body_parser_1.default.json({ limit: '50mb' }));
app.use(body_parser_1.default.urlencoded({ limit: '50mb', extended: true }));
app.use((0, cors_1.default)(corsOptions));
// Connexion à MongoDB
mongoose_1.default.connect(process.env.MONGO_URI)
    .then(() => {
    console.log('Connected to MongoDB');
})
    .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
});
// Utilisation des routes pour les gig
app.use('/api/gigs', gigRoute_1.default);
// Utilisation des routes pour l'IA
app.use('/api/ai', aiRoute_1.default);
// Utilisation des routes pour les pays
app.use('/api/countries', countryRoute_1.default);
// Utilisation des routes pour les devises
app.use('/api/currencies', currencyRoute_1.default);
// Utilisation des routes pour le traitement en bulk
app.use('/api/bulk', bulkRoute_1.default);
// Route de base
app.get('/', (req, res) => {
    res.send('Hello, welcome to the Gig API');
});
// Démarrer le serveur
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
