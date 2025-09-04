import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import productRoutes from './routes/products';
import orderRoutes from './routes/orders';
import adminRoutes from './routes/admin';

const app = express();

// Trust proxy for rate limiting
app.set('trust proxy', 1);
let prisma: PrismaClient | null = null;
let dbConnected = false;

// Try to connect to database
async function initializeDatabase() {
  // Temporarily disable database connection - schema not ready
  console.log('⚠️ Using fallback data system (database disabled for demo)');
  dbConnected = false;
  prisma = null;
  return;
  
  try {
    prisma = new PrismaClient();
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    dbConnected = true;
  } catch (error) {
    console.log('⚠️ Database connection failed - using fallback data');
    console.log('Please check your DATABASE_URL environment variable');
    dbConnected = false;
    prisma = null;
  }
}

const PORT = parseInt(process.env.PORT || '3001');

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5000',
  credentials: true
}));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Make Prisma and DB status available to routes
app.use((req, res, next) => {
  req.prisma = prisma;
  req.dbConnected = dbConnected;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize database before starting server
initializeDatabase().then(() => {
  const server = app.listen(PORT, '127.0.0.1', () => {
    console.log(`🚀 Backend server running on http://127.0.0.1:${PORT}`);
    console.log(`📊 Health check available at http://127.0.0.1:${PORT}/api/health`);
    console.log(`💾 Database: ${dbConnected ? 'Connected' : 'Using fallback data'}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(async () => {
      console.log('HTTP server closed');
      if (prisma) await prisma.$disconnect();
      process.exit(0);
    });
  });
});

export default app;