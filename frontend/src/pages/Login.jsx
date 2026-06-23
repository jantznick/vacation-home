import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../api/api';
import useAuthStore from '../store/authStore';
import { APP_TAGLINE } from '../lib/brand';
import Button from '../components/Button';
import MarketingLayout from '../components/MarketingLayout';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/searches';
  const { setUser, isAuthenticated, isLoading } = useAuthStore();
  const [email, setEmail] = useState(() => searchParams.get('email') || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isLoading && isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await authAPI.login(email, password);
      setUser(data.user);
      navigate(redirectTo);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const registerQuery = searchParams.toString();
  const registerHref = registerQuery ? `/register?${registerQuery}` : '/register';

  return (
    <MarketingLayout showFooter={false}>
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-xl border border-pine-200 bg-white p-8 shadow-sm">
          <Link to="/" className="cursor-pointer text-sm text-pine-500 hover:text-pine-800">← Home</Link>
          <h1 className="mt-4 text-2xl font-semibold text-pine-900">Sign in</h1>
          <p className="mt-2 text-sm text-pine-600">{APP_TAGLINE}</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-pine-800">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border border-pine-300 px-3 py-2 text-sm focus:border-pine-500 focus:outline-none focus:ring-2 focus:ring-pine-200"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-pine-800">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-md border border-pine-300 px-3 py-2 text-sm focus:border-pine-500 focus:outline-none focus:ring-2 focus:ring-pine-200"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-pine-600">
          Need an account?{' '}
          <Link to={registerHref} className="cursor-pointer font-medium text-pine-700 hover:text-pine-900">
            Create account
          </Link>
        </p>
        </div>
      </div>
    </MarketingLayout>
  );
}
