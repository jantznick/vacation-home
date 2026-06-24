import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function AdminRoute({ children }) {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-pine-600">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (!user?.isAdmin) {
    return <Navigate to="/searches" replace />;
  }

  return children;
}
