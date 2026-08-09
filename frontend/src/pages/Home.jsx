import SEO from '../components/seo/SEO.jsx';
import JsonLd, { organizationSchema } from '../components/seo/JsonLd.jsx';
import Hero from '../components/home/Hero.jsx';
import MentorSpotlight from '../components/home/MentorSpotlight.jsx';
import FeaturedCourses from '../components/home/FeaturedCourses.jsx';
import Testimonials from '../components/home/Testimonials.jsx';
import Toppers from '../components/home/Toppers.jsx';
import QuestionOfDay from '../components/home/QuestionOfDay.jsx';
import LatestVideos from '../components/home/LatestVideos.jsx';
import VideoHighlights from '../components/home/VideoHighlights.jsx';
import BlogPreview from '../components/home/BlogPreview.jsx';
import FreeResources from '../components/home/FreeResources.jsx';
import CTABand from '../components/home/CTABand.jsx';

export default function Home() {
  return (
    <>
      <SEO
        title="Physics Courses for IIT-JEE, NEET & Olympiads"
        description="Angular Physics offers physics-only courses for JEE Main & Advanced, NEET, and Physics Olympiads — mentored entirely by Abhishek Kumar Garg, producer of double-digit AIRs in IIT-JEE & NEET."
        path="/"
      />
      <JsonLd schema={organizationSchema} />

      <main>
        <Hero />
        <MentorSpotlight />
        <FeaturedCourses />
        <Testimonials />
        <Toppers />
        <QuestionOfDay />
        <LatestVideos />
        <VideoHighlights />
        <BlogPreview />
        <FreeResources />
        <CTABand />
      </main>
    </>
  );
}
