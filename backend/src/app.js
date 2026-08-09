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
import paymentRoutes from './routes/payment.routes.js';
import noteRoutes from './routes/note.routes.js';
import videoRoutes from './routes/video.routes.js';
import testRoutes from './routes/test.routes.js';
import recommendationRoutes from './routes/recommendation.routes.js';
import questionRoutes from './routes/question.routes.js';
import doubtRoutes from './routes/doubt.routes.js';
import conceptCodeRoutes from './routes/conceptCode.routes.js';
import worksheetRoutes from './routes/worksheet.routes.js';
import youtubeRoutes from './routes/youtube.routes.js';
import videoLibraryRoutes from './routes/videoLibrary.routes.js';
import featuredVideoRoutes from './routes/featuredVideo.routes.js';
import articleRoutes from './routes/article.routes.js';
import topperRoutes from './routes/topper.routes.js';
import testimonialRoutes from './routes/testimonial.routes.js';
import questionOfDayRoutes from './routes/questionOfDay.routes.js';
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
app.use('/api/payments', paymentRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/doubts', doubtRoutes);
app.use('/api/concept-codes', conceptCodeRoutes);
app.use('/api/worksheets', worksheetRoutes);
app.use('/api/youtube', youtubeRoutes);
app.use('/api/video-library', videoLibraryRoutes);
app.use('/api/featured-videos', featuredVideoRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/toppers', topperRoutes);
app.use('/api/testimonials', testimonialRoutes);
app.use('/api/question-of-day', questionOfDayRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
