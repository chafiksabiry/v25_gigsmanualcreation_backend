import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: process.env.PORT || 3000,
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5176'
    }
  },
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/gig-management'
  }
} as const;