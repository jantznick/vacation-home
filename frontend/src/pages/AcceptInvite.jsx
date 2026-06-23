import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { searchesAPI } from '../api/api';
import { searchPath } from '../hooks/useSearch';
import { setLastSearchId } from './Searches';
import useAuthStore from '../store/authStore';
import Button from '../components/Button';
import Card from '../components/Card';

function rolePhrase(role) {
  if (role === 'editor') return 'an editor';
  if (role === 'viewer') return 'a viewer';
  if (role === 'owner') return 'an owner';
  return role;
}

export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuthStore();
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await searchesAPI.getInvite(token);
        setInvite(data.invite);
      } catch (err) {
        setError(err.message);
      }
    };

    load();
  }, [token]);

  const handleAccept = async () => {
    setAccepting(true);
    setError('');

    try {
      const data = await searchesAPI.acceptInvite(token);
      setLastSearchId(data.search.id);
      navigate(searchPath(data.search.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setAccepting(false);
    }
  };

  const inviteReturnPath = `/invites/${token}`;
  const authQuery = new URLSearchParams({
    redirect: inviteReturnPath,
    ...(invite?.email ? { email: invite.email } : {}),
  }).toString();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-pine-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <h1 className="text-xl font-semibold text-pine-900">Search invitation</h1>

        {error && !invite && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        {invite && (
          <>
            <p className="mt-3 text-sm text-pine-600">
              <strong>{invite.invitedBy}</strong> invited you to collaborate on{' '}
              <strong>{invite.search.name}</strong> as {rolePhrase(invite.role)}.
            </p>
            <p className="mt-2 text-xs text-pine-500">Invite for: {invite.email}</p>

            {error && (
              <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            {!isAuthenticated ? (
              <div className="mt-6 flex flex-col gap-3">
                <p className="text-sm text-pine-600">
                  Sign in or create an account with <strong>{invite.email}</strong> to accept.
                </p>
                <Link to={`/login?${authQuery}`} className="block">
                  <Button className="w-full">Sign in</Button>
                </Link>
                <Link to={`/register?${authQuery}`} className="block">
                  <Button variant="secondary" className="w-full">Create account</Button>
                </Link>
              </div>
            ) : (
              <div className="mt-6">
                <Button onClick={handleAccept} disabled={accepting} className="w-full">
                  {accepting ? 'Joining...' : 'Accept invitation'}
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
