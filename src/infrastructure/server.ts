import express from 'express';
import cors from 'cors';
import { config } from './config/config';
import { connectDatabase } from './config/database';
import { gigRoutes } from './routes/gigRoutes';

const app = express();

// Middleware
app.use(cors(config.server.cors));
app.use(express.json());

// Routes
app.use('/api/gigs', gigRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const startServer = async () => {
  try {
    await connectDatabase();
    app.listen(config.server.port, () => {
      console.log(`Server is running on port ${config.server.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();