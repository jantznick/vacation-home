import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../api/api';
import useAuthStore from '../store/authStore';
import Button from '../components/Button';
import MarketingLayout from '../components/MarketingLayout';

export default function VerifyLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/searches';
  const token = searchParams.get('token');
  const { setUser, isAuthenticated, isLoading } = useAuthStore();
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(Boolean(token));

  useEffect(() => {
    if (!token || isLoading || isAuthenticated) return undefined;

    let cancelled = false;

    const verify = async () => {
      setVerifying(true);
      setError('');

      try {
        const data = await authAPI.verifyMagicLinkToken(token);
        if (!cancelled) {
          setUser(data.user);
          navigate(redirectTo, { replace: true });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setVerifying(false);
        }
      }
    };

    verify();

    return () => {
      cancelled = true;
    };
  }, [token, isLoading, isAuthenticated, setUser, navigate, redirectTo]);

  if (!isLoading && isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const loginHref = searchParams.toString()
    ? `/login?${searchParams.toString()}`
    : '/login';

  return (
    <MarketingLayout showFooter={false}>
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-xl border border-pine-200 bg-white p-8 shadow-sm text-center">
          {verifying && !error ? (
            <>
              <h1 className="text-2xl font-semibold text-pine-900">Signing you in...</h1>
              <p className="mt-2 text-sm text-pine-600">Verifying your sign-in link.</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold text-pine-900">Sign-in link expired</h1>
              <p className="mt-2 text-sm text-red-700">{error || 'This link is no longer valid.'}</p>
              <Link to={loginHref} className="mt-6 inline-block">
                <Button>Back to sign in</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </MarketingLayout>
  );
}
