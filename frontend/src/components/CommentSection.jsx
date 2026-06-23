import { useEffect, useState } from 'react';
import { commentsAPI } from '../api/api';
import useAuthStore from '../store/authStore';

function CommentSection({ targetType, targetId }) {
  const { user } = useAuthStore();
  const [comments, setComments] = useState([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadComments = async () => {
    setLoading(true);
    try {
      const data = await commentsAPI.getAll(targetType, targetId);
      setComments(data.comments);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [targetType, targetId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;

    setSubmitting(true);
    setError('');
    try {
      await commentsAPI.create({ targetType, targetId, body: body.trim() });
      setBody('');
      await loadComments();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await commentsAPI.delete(id);
      await loadComments();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold">Comments</h2>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <form onSubmit={handleSubmit} className="mb-6 space-y-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Add a note for you and your partner..."
          className="w-full rounded-lg border border-stone-300 px-3 py-2"
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {submitting ? 'Posting...' : 'Post Comment'}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-stone-500">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-stone-500">No comments yet.</p>
      ) : (
        <ul className="space-y-4">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-lg bg-stone-50 p-4">
              <div className="mb-2 flex items-center justify-between gap-4">
                <div className="text-sm text-stone-500">
                  {comment.user.email} · {new Date(comment.createdAt).toLocaleString()}
                </div>
                {comment.user.id === user?.id && (
                  <button
                    type="button"
                    onClick={() => handleDelete(comment.id)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Delete
                  </button>
                )}
              </div>
              <p className="whitespace-pre-wrap text-stone-800">{comment.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default CommentSection;
