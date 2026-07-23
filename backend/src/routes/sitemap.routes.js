import { Router } from 'express';
import { getAllCourses } from '../services/course.service.js';
import { env } from '../config/env.js';

const router = Router();

/**
 * Dynamically generated sitemap so every new course is automatically
 * discoverable by search engines / AI crawlers without a manual rebuild.
 */
router.get('/sitemap.xml', async (req, res) => {
  const courses = await getAllCourses();
  const staticRoutes = ['', '/courses', '/mentor', '/about', '/contact'];

  const urls = [
    ...staticRoutes.map(
      (path) => `<url><loc>${env.siteUrl}${path}</loc><changefreq>weekly</changefreq></url>`
    ),
    ...courses.map(
      (c) =>
        `<url><loc>${env.siteUrl}/courses/${c.slug}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`
    ),
  ].join('');

  res.set('Content-Type', 'application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
});

export default router;
