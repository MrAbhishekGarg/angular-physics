import { useState } from 'react';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { useMentorArticles } from '../../hooks/useArticles.js';
import { articleService } from '../../services/articleService.js';
import formStyles from './DashboardForm.module.css';

const emptyForm = { title: '', slug: '', excerpt: '', body: '', status: 'draft' };

export default function ArticleManager() {
  const { data: articles, loading, error, refetch } = useMentorArticles();
  const [form, setForm] = useState(emptyForm);
  const [coverFile, setCoverFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const startEdit = (article) => {
    setEditingId(article._id);
    setForm({
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      body: article.body,
      status: article.status,
    });
    setCoverFile(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setCoverFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      let article;
      if (editingId) article = await articleService.update(editingId, form);
      else article = await articleService.create(form);
      if (coverFile) await articleService.uploadCoverImage(article._id, coverFile);
      setForm(emptyForm);
      setCoverFile(null);
      setEditingId(null);
      await refetch();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (article) => {
    if (!window.confirm(`Delete "${article.title}"?`)) return;
    await articleService.remove(article._id);
    await refetch();
  };

  return (
    <>
      <SEO title="Manage Articles" description="Write and publish blog articles." path="/dashboard/mentor/articles" />
      <DashboardLayout role="mentor">
        <div className={formStyles.wrap} style={{ maxWidth: 900 }}>
          <h1>Manage Articles</h1>

            {loading && <Spinner label="Loading articles…" />}
            {error && <ErrorState message={error} onRetry={refetch} />}

            {articles && (
              <div style={{ marginBottom: 'var(--ap-space-lg)' }}>
                {articles.length === 0 ? (
                  <p style={{ color: 'var(--ap-text-muted)' }}>No articles yet.</p>
                ) : (
                  articles.map((a) => (
                    <div key={a._id} className={formStyles.card}>
                      <div className={formStyles.cardHeader}>
                        <strong>{a.title}</strong>
                        <Badge tone={a.status === 'published' ? 'success' : 'default'}>{a.status}</Badge>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--ap-text-muted)' }}>{a.excerpt}</p>
                      <p style={{ fontSize: '0.8rem' }}>/{a.slug}</p>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <Button size="sm" variant="ghost" onClick={() => startEdit(a)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(a)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            <h2 style={{ color: 'var(--ap-primary)', marginBottom: 'var(--ap-space-sm)' }}>
              {editingId ? 'Edit Article' : 'Write an Article'}
            </h2>
            <form className={formStyles.form} onSubmit={handleSubmit}>
              <label>
                Title
                <input name="title" required value={form.title} onChange={handleChange} />
              </label>
              <label>
                Slug (optional — derived from title if left blank)
                <input
                  name="slug"
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  title="Lowercase letters, numbers, and hyphens only (e.g. my-article-title)"
                  value={form.slug}
                  onChange={handleChange}
                  placeholder="my-article-title"
                />
              </label>
              <label>
                Excerpt
                <textarea name="excerpt" rows="2" required value={form.excerpt} onChange={handleChange} />
              </label>
              <label>
                Body (separate paragraphs with a blank line)
                <textarea name="body" rows="10" required value={form.body} onChange={handleChange} />
              </label>
              <label>
                Cover image (optional)
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setCoverFile(e.target.files[0])} />
              </label>
              <label>
                Status
                <select name="status" value={form.status} onChange={handleChange}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </label>

              <div className={formStyles.actions}>
                <Button type="submit" disabled={busy}>
                  {busy ? 'Saving…' : editingId ? 'Save Changes' : 'Publish Article'}
                </Button>
                {editingId && (
                  <Button type="button" variant="ghost" onClick={cancelEdit}>
                    Cancel
                  </Button>
                )}
              </div>

              {formError && <p className={formStyles.errorMsg}>{formError}</p>}
            </form>
        </div>
      </DashboardLayout>
    </>
  );
}
