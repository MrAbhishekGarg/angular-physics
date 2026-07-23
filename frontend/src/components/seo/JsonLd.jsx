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
  logo: 'https://www.angularphysics.com/favicon.svg',
  sameAs: [],
  founder: {
    '@type': 'Person',
    name: 'Abhishek Kumar Garg',
    jobTitle: 'Founder & Lead Physics Mentor',
  },
};

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
      name: course.mentor || 'Abhishek Kumar Garg',
    },
    offers: {
      '@type': 'Offer',
      price: course.price,
      priceCurrency: course.currency || 'INR',
      availability: course.status === 'open' ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder',
    },
  };
}
