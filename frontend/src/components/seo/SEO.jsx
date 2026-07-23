import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'Angular Physics';
const DEFAULT_IMAGE = 'https://www.angularphysics.com/og-image.png';
const SITE_URL = 'https://www.angularphysics.com';

/**
 * Every page renders <SEO/> once with its own title/description.
 * Centralizing the tag list here means adding a new meta tag site-wide
 * (e.g. a new Twitter field) only requires one edit (DRY), while each
 * page still controls its own content.
 */
export default function SEO({ title, description, path = '', image = DEFAULT_IMAGE, type = 'website' }) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Find Your Angle to Every Answer`;
  const canonical = `${SITE_URL}${path}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />

      {/* Open Graph */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />
      <meta property="og:type" content={type} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
}
