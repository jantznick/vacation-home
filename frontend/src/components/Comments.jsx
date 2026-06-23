import { useEffect, useState } from 'react';
import useAuthStore from '../store/authStore';
import { useSearchAPI } from '../hooks/useSearch';
import useSearchAccess from '../hooks/useSearchAccess';
import Button from './Button';
import ConfirmModal from './ConfirmModal';

export default function Comments({ targetType, targetId }) {
  const api = useSearchAPI();
  const { isOwner } = useSearchAccess();
  const { user } = useAuthStore();
  const [comments, setComments] = useState([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [deletingComment, setDeletingComment] = useState(false);

  const loadComments = async () => {
    setLoading(true);
    try {
      const data = await api.comments.list(targetType, targetId);
      setComments(data.comments);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [targetType, targetId, api]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!body.trim()) return;

    setSubmitting(true);
    setError('');
    try {
      await api.comments.create({ targetType, targetId, body });
      setBody('');
      await loadComments();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async () => {
    if (!commentToDelete) return;

    setDeletingComment(true);
    setError('');

    try {
      await api.comments.remove(commentToDelete);
      setCommentToDelete(null);
      await loadComments();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingComment(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-pine-900">Comments</h3>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Add a note for you and your spouse..."
          className="w-full rounded-md border border-pine-300 px-3 py-2 text-sm focus:border-pine-500 focus:outline-none focus:ring-2 focus:ring-pine-200"
        />
        <Button type="submit" disabled={submitting || !body.trim()}>
          {submitting ? 'Posting...' : 'Post comment'}
        </Button>
      </form>

      {loading ? (
        <p className="text-sm text-pine-600">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-pine-600">No comments yet.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => (
            <li
              key={comment.id}
              className="rounded-lg border border-pine-200 bg-pine-50 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-pine-900">{comment.body}</p>
                  <p className="mt-1 text-xs text-pine-500">
                    {comment.user.email} · {new Date(comment.createdAt).toLocaleString()}
                  </p>
                </div>
                {(user?.id === comment.user.id || isOwner) && (
                  <button
                    type="button"
                    onClick={() => setCommentToDelete(comment.id)}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {commentToDelete && (
        <ConfirmModal
          title="Delete comment"
          message="Are you sure you want to delete this comment?"
          onConfirm={handleDeleteComment}
          onCancel={() => setCommentToDelete(null)}
          loading={deletingComment}
          loadingLabel="Deleting..."
        />
      )}
    </div>
  );
}
