"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const body_parser_1 = __importDefault(require("body-parser"));
const gigRoute_1 = __importDefault(require("./route/gigRoute"));
const cors_1 = __importDefault(require("cors"));
dotenv_1.default.config(); // Pour charger les variables d'environnement depuis un fichier .env
const app = (0, express_1.default)();
const port = process.env.PORT || 5003;
// Middleware pour parser le corps des requêtes en JSON
app.use(body_parser_1.default.json());
app.use((0, cors_1.default)());
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
// Route de base
app.get('/', (req, res) => {
    res.send('Hello, welcome to the Gig API');
});
// Démarrer le serveur
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
