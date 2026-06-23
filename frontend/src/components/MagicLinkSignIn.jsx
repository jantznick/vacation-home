import { useEffect, useState } from 'react';
import { authAPI } from '../api/api';
import Button from './Button';

export default function MagicLinkSignIn({
  email,
  onSuccess,
  onCancel,
  cancelLabel = 'Sign in with password instead',
  requestOnMount = false,
}) {
  const [step, setStep] = useState(requestOnMount ? 'sending' : 'email');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const sendLink = async () => {
    setLoading(true);
    setError('');

    try {
      await authAPI.requestMagicLink(email);
      setStep('code');
    } catch (err) {
      setError(err.message);
      setStep('email');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (requestOnMount && email) {
      sendLink();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRequest = async (event) => {
    event.preventDefault();
    await sendLink();
  };

  const handleVerifyCode = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await authAPI.verifyMagicLinkCode(email, code);
      onSuccess(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'sending') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-pine-600">Sending sign-in link to <strong>{email}</strong>...</p>
      </div>
    );
  }

  if (step === 'code') {
    return (
      <form onSubmit={handleVerifyCode} className="space-y-4">
        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <p className="text-sm text-pine-600">
          We sent a sign-in link and 6-digit code to <strong>{email}</strong>.
        </p>

        <div>
          <label htmlFor="magic-code" className="mb-1 block text-sm font-medium text-pine-800">
            Sign-in code
          </label>
          <input
            id="magic-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            required
            className="w-full rounded-md border border-pine-300 px-3 py-2 text-sm tracking-widest focus:border-pine-500 focus:outline-none focus:ring-2 focus:ring-pine-200"
            placeholder="123456"
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
          {loading ? 'Verifying...' : 'Verify code'}
        </Button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full cursor-pointer text-sm text-pine-600 hover:text-pine-900"
          >
            {cancelLabel}
          </button>
        )}
      </form>
    );
  }

  return (
    <form onSubmit={handleRequest} className="space-y-4">
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <p className="text-sm text-pine-600">
        We&apos;ll email a sign-in link and code to <strong>{email}</strong>.
      </p>

      <Button type="submit" variant="secondary" className="w-full" disabled={loading}>
        {loading ? 'Sending...' : 'Send sign-in link'}
      </Button>

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="w-full cursor-pointer text-sm text-pine-600 hover:text-pine-900"
        >
          {cancelLabel}
        </button>
      )}
    </form>
  );
}
