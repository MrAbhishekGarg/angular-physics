import { Link } from 'react-router-dom';
import SEO from '../components/seo/SEO.jsx';
import Container from '../components/common/Container.jsx';
import Button from '../components/common/Button.jsx';
import styles from './StaticPage.module.css';

export default function NotFound() {
  return (
    <>
      <SEO title="Page Not Found" description="The page you're looking for doesn't exist." path="/404" />
      <main>
        <Container>
          <div className={styles.wrap} style={{ textAlign: 'center' }}>
            <h1>404 — Page Not Found</h1>
            <p>The page you're looking for has drifted off its orbit.</p>
            <Button as={Link} to="/">
              Back to Home
            </Button>
          </div>
        </Container>
      </main>
    </>
  );
}
