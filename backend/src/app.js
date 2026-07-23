import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';

import { env } from './config/env.js';
import courseRoutes from './routes/course.routes.js';
import leadRoutes from './routes/lead.routes.js';
import sitemapRoutes from './routes/sitemap.routes.js';
import authRoutes from './routes/auth.routes.js';
import enrollmentRoutes from './routes/enrollment.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(compression());
app.use(express.json());
app.use(cookieParser());
app.use(morgan(env.isProd ? 'combined' : 'dev'));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Basic rate limiting on write endpoints to prevent form-spam abuse
const leadLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'angular-physics-api' }));

app.use('/', sitemapRoutes); // exposes /sitemap.xml
app.use('/api/courses', courseRoutes);
app.use('/api/leads', leadLimiter, leadRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/analytics', analyticsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
