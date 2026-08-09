import Container from '../common/Container.jsx';
import SectionHeading from '../common/SectionHeading.jsx';
import Card from '../common/Card.jsx';
import Button from '../common/Button.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { noteService } from '../../services/noteService.js';
import styles from './FreeResources.module.css';

function formatFileSize(bytes) {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

/** Real free notes pulled from the Note collection — no login required to download. */
export default function FreeResources() {
  const { data: notes } = useFetch(() => noteService.getPublicFree(), []);

  if (!notes || notes.length === 0) return null;

  return (
    <section className={styles.section} aria-labelledby="resources-heading">
      <Container>
        <SectionHeading
          eyebrow="Free Downloads"
          title="Study material, on the house"
          subtitle="No login required — start with these before enrolling in a full course."
        />
        <div className={styles.grid}>
          {notes.map((note) => (
            <Card key={note._id} className={styles.card}>
              <h3 className={styles.title}>{note.title}</h3>
              <p className={styles.desc}>{note.description}</p>
              <div className={styles.cardFooter}>
                <span className={styles.meta}>{formatFileSize(note.fileSizeBytes)}</span>
                <Button as="a" href={noteService.publicDownloadUrl(note._id)} target="_blank" rel="noopener noreferrer" variant="ghost" size="sm">
                  Download
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
