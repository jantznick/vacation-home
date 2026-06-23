import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import { authAPI } from './api/api';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyLogin from './pages/VerifyLogin';
import Searches from './pages/Searches';
import AcceptInvite from './pages/AcceptInvite';
import Dashboard from './pages/Dashboard';
import Regions from './pages/Regions';
import RegionDetail from './pages/RegionDetail';
import RegionForm from './pages/RegionForm';
import Listings from './pages/Listings';
import ListingDetail from './pages/ListingDetail';
import ListingForm from './pages/ListingForm';
import PricingModels from './pages/PricingModels';
import Profile from './pages/Profile';
import MapOverview from './pages/MapOverview';
import SearchSettings from './pages/SearchSettings';
import HomeRoute from './components/HomeRoute';
import { Privacy, Terms } from './pages/LegalPage';
import About from './pages/About';
import Contact from './pages/Contact';

function AppLayout({ children }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

function SearchLayout({ children }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await authAPI.me();
        setUser(data.user);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [setUser, setLoading]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/auth/verify" element={<VerifyLogin />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/invites/:token" element={<AcceptInvite />} />

      <Route path="/searches" element={<AppLayout><Searches /></AppLayout>} />

      <Route path="/searches/:searchId" element={<SearchLayout><Dashboard /></SearchLayout>} />
      <Route path="/searches/:searchId/regions" element={<SearchLayout><Regions /></SearchLayout>} />
      <Route path="/searches/:searchId/regions/new" element={<SearchLayout><RegionForm /></SearchLayout>} />
      <Route path="/searches/:searchId/regions/:id/edit" element={<SearchLayout><RegionForm /></SearchLayout>} />
      <Route path="/searches/:searchId/regions/:id" element={<SearchLayout><RegionDetail /></SearchLayout>} />
      <Route path="/searches/:searchId/listings" element={<SearchLayout><Listings /></SearchLayout>} />
      <Route path="/searches/:searchId/listings/new" element={<SearchLayout><ListingForm /></SearchLayout>} />
      <Route path="/searches/:searchId/listings/:id/edit" element={<SearchLayout><ListingForm /></SearchLayout>} />
      <Route path="/searches/:searchId/listings/:id" element={<SearchLayout><ListingDetail /></SearchLayout>} />
      <Route path="/searches/:searchId/pricing-models" element={<SearchLayout><PricingModels /></SearchLayout>} />
      <Route path="/searches/:searchId/map" element={<SearchLayout><MapOverview /></SearchLayout>} />
      <Route path="/searches/:searchId/settings" element={<SearchLayout><SearchSettings /></SearchLayout>} />
      <Route path="/profile" element={<AppLayout><Profile /></AppLayout>} />

      <Route path="/" element={<HomeRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
