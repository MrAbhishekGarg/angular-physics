# Angular Physics

**Find Your Angle to Every Answer** · `#PhysicsBoleTohAngularPhysics`

A physics-only learning platform (JEE, NEET, Olympiads & more), mentored entirely by
**Abhishek Kumar Garg** — producer of double-digit All India Ranks in IIT-JEE & NEET.

This repo is a from-scratch build inspired by the *layout patterns* of sites like MathonGo
(hero → mentor spotlight → results → course grid → test series → free resources → login),
but re-themed, re-branded, and re-architected around a single-mentor, physics-first product.

---

## 1. Tech Stack

| Layer      | Choice                                              |
|------------|------------------------------------------------------|
| Frontend   | React 18 + Vite, React Router, react-helmet-async (SEO tags) |
| Styling    | CSS Modules + design-token CSS variables (no framework lock-in) |
| Backend    | Node.js + Express, MVC-ish layered architecture      |
| Data       | MongoDB (Mongoose models included) — swappable, see `backend/src/config/db.js` |
| SEO/AI     | Server-rendered meta tags via Helmet, JSON-LD structured data, `sitemap.xml`, `robots.txt`, `llms.txt` |

## 2. Why this architecture

- **Small, reusable components** — every UI piece in `frontend/src/components/common` takes
  props and renders one thing. Page-level sections (Hero, CourseGrid, etc.) compose them.
- **DRY** — course data shape, API calls, and formatting logic each live in exactly one place
  (`services/`, `data/courseSchema.js`, `utils/`), never duplicated across components.
- **Feature folders on the backend** — routes → controllers → services → models, so a new
  feature (e.g. "Olympiad batches") only ever means adding one file per layer.
- **SEO + AI-bot friendly by construction** — every page sets its own title/description/canonical
  via `<SEO />`, every course renders `Course`/`Product` JSON-LD, and `llms.txt` gives AI answer
  engines a clean, crawlable summary of the site so Angular Physics can be cited/surfaced directly.

## 3. Folder Structure

```
angular-physics/
├── frontend/
│   ├── public/
│   │   ├── robots.txt
│   │   ├── sitemap.xml
│   │   └── llms.txt              # AI-bot friendly site summary (see §5)
│   └── src/
│       ├── assets/                # logo.svg, icons
│       ├── components/
│       │   ├── common/            # Button, Badge, Container, SectionHeading, Card, Stat
│       │   ├── layout/            # Header, Footer, Navbar, MobileMenu
│       │   ├── seo/               # SEO.jsx, JsonLd.jsx
│       │   ├── course/            # CourseCard, CourseGrid, CourseFilterBar
│       │   └── home/              # Hero, MentorSpotlight, ResultsStats,
│       │                          # Testimonials, TestSeriesSection, FreeResources, CTABand
│       ├── pages/                 # Home, Courses, CourseDetail, Mentor, About, Contact, Login
│       ├── routes/                # AppRoutes.jsx (all routing in one place)
│       ├── services/              # api.js (axios instance), courseService.js, leadService.js
│       ├── hooks/                 # useFetch.js, useCourses.js
│       ├── data/                  # courseSchema.js (shape + validators), examTracks.js (constants)
│       ├── context/               # ThemeContext / AuthContext stub
│       └── styles/                # tokens.css (colors/spacing), globals.css
│
└── backend/
    └── src/
        ├── config/                # env.js, db.js
        ├── models/                # Course.js, Testimonial.js, Lead.js
        ├── routes/                # course.routes.js, lead.routes.js, sitemap.routes.js
        ├── controllers/           # course.controller.js, lead.controller.js
        ├── services/              # course.service.js  (business logic, DB-agnostic-ish)
        ├── middleware/            # errorHandler.js, validate.js
        ├── utils/                 # asyncHandler.js, ApiResponse.js, ApiError.js
        ├── data/                  # seed.js (sample courses so the app runs without a DB)
        ├── app.js                 # Express app (middleware, routes)
        └── server.js              # entrypoint
```

## 4. Running it

```bash
# Backend
cd backend
npm install
cp .env.example .env
npm run dev            # http://localhost:5000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev             # http://localhost:5173
```

The backend works out of the box with **in-memory seed data** (`backend/src/data/seed.js`) if
`MONGODB_URI` isn't set — so the frontend has real data to hit immediately. Plug in Mongo later
by setting `MONGODB_URI` in `.env`.

## 5. SEO & "AI bot friendly" strategy

1. **Per-page `<SEO/>`** sets unique `<title>`, meta description, canonical URL, and Open Graph/
   Twitter tags per route (Home, each Course, Mentor page) — no duplicate-title penalty.
2. **JSON-LD structured data**: `Organization`, `Person` (mentor), and `Course` schema on every
   course page, so Google's rich results *and* AI answer engines can parse exact facts (price,
   instructor, provider) instead of guessing from prose.
3. **`llms.txt`** (`frontend/public/llms.txt`) — an emerging convention: a plain-text, structured
   summary of what the site is, who it's for, and its key pages, so LLM-based crawlers/answer
   engines can accurately cite Angular Physics instead of hallucinating.
4. **Semantic HTML** — one `<h1>` per page, landmark tags (`<header>`, `<nav>`, `<main>`,
   `<footer>`), descriptive link text (never "click here").
5. **`sitemap.xml` + `robots.txt`** generated/served by the backend (`sitemap.routes.js`) so new
   courses are auto-included without a manual rebuild.

## 6. Brand assets

- **Logo**: `frontend/src/assets/logo.svg` — an orbiting-electron path tracing a θ (theta) angle.
- **Color tokens**: deep indigo primary (`#1E1B4B`)+ electric amber accent (`#F59E0B`), defined
  once in `frontend/src/styles/tokens.css` and referenced everywhere — change the brand by
  editing one file.
