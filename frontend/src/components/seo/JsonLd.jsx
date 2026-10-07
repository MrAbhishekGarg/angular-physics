import { Helmet } from 'react-helmet-async';

/**
 * Renders a <script type="application/ld+json"> block. Used for
 * Organization / Person / Course schema so Google rich results AND
 * AI answer engines (which increasingly parse JSON-LD directly rather
 * than prose) get exact, unambiguous facts.
 */
export default function JsonLd({ schema }) {
  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: 'Angular Physics',
  slogan: 'Find Your Angle to Every Answer',
  url: 'https://www.angularphysics.com',
  logo: 'https://www.angularphysics.com/logo-social.png',
  sameAs: [],
  founder: {
    '@type': 'Person',
    name: 'Abhishek Garg',
    jobTitle: 'Founder & Lead Physics Mentor',
  },
};

export function videoListSchema(videos) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: videos.slice(0, 30).map((v, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'VideoObject',
        name: v.title,
        thumbnailUrl: v.thumbnailUrl,
        uploadDate: v.publishedAt,
        embedUrl: `https://www.youtube.com/embed/${v.id}`,
        url: `https://www.youtube.com/watch?v=${v.id}`,
      },
    })),
  };
}

export function articleSchema(article) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.excerpt,
    image: article.coverImageUrl || undefined,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt || article.publishedAt,
    author: {
      '@type': 'Person',
      name: article.author || 'Abhishek Garg',
    },
    publisher: {
      '@type': 'EducationalOrganization',
      name: 'Angular Physics',
      logo: { '@type': 'ImageObject', url: 'https://www.angularphysics.com/logo-social.png' },
    },
    mainEntityOfPage: `https://www.angularphysics.com/blog/${article.slug}`,
  };
}

export function courseSchema(course) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    description: course.description,
    provider: {
      '@type': 'EducationalOrganization',
      name: 'Angular Physics',
      sameAs: 'https://www.angularphysics.com',
    },
    instructor: {
      '@type': 'Person',
      name: course.mentor || 'Abhishek Garg',
    },
    offers: {
      '@type': 'Offer',
      price: course.price,
      priceCurrency: course.currency || 'INR',
      availability: course.status === 'open' ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder',
    },
  };
}
