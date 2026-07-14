import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { authAPI, searchesAPI } from '../api/api';
import { searchPath } from '../hooks/useSearch';
import { setLastSearchId } from '../pages/Searches';
import { APP_NAME, APP_SHORT_NAME } from '../lib/brand';
import { assetTypeMeta, supportsRegions, supportsBoatMakes, supportsMarinas } from '../lib/assetTypes';
import SearchSwitcher from './SearchSwitcher';

const navItems = (searchId, assetType = 'home') => {
  const items = [
    { to: searchPath(searchId), label: 'Dashboard', end: true },
  ];

  if (supportsRegions(assetType)) {
    items.push({ to: searchPath(searchId, '/regions'), label: 'Regions' });
  }

  if (supportsBoatMakes(assetType)) {
    items.push({ to: searchPath(searchId, '/makes'), label: 'Makes' });
  }

  if (supportsMarinas(assetType)) {
    items.push({ to: searchPath(searchId, '/marinas'), label: 'Marinas' });
  }

  items.push(
    { to: searchPath(searchId, '/listings'), label: 'Listings' },
    { to: searchPath(searchId, '/compare'), label: 'Compare' },
    { to: searchPath(searchId, '/map'), label: 'Map' },
    { to: searchPath(searchId, '/estimator'), label: 'Estimator' },
    { to: searchPath(searchId, '/price-picker'), label: 'Price picker' },
    { to: searchPath(searchId, '/settings'), label: 'Settings' },
  );

  return items;
};

const navLinkClass = ({ isActive }) =>
  `block rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-white/15 text-white'
      : 'text-pine-200 hover:bg-white/10 hover:text-white'
  }`;

export default function Layout({ children }) {
  const { searchId } = useParams();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [searches, setSearches] = useState([]);
  const [currentSearch, setCurrentSearch] = useState(null);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!searchId) {
      return;
    }

    const load = async () => {
      try {
        const listData = await searchesAPI.list();
        if (!listData.searches.some((s) => s.id === searchId)) {
          navigate('/searches', { replace: true });
          return;
        }
        setSearches(listData.searches);
        setCurrentSearch(listData.searches.find((s) => s.id === searchId) || null);
        setLastSearchId(searchId);
      } catch {
        navigate('/searches', { replace: true });
      }
    };

    load();
  }, [searchId, navigate]);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch {
      // Still clear local state if server call fails
    }
    logout();
    navigate('/login');
  };

  const handleSearchSelect = (nextId) => {
    setLastSearchId(nextId);
    navigate(searchPath(nextId));
  };

  const showSearchNav = Boolean(searchId);
  const assetType = currentSearch?.assetType || 'home';
  const items = showSearchNav ? navItems(searchId, assetType) : [];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-[1100] border-b border-pine-800 bg-pine-900 text-white">
        <div className="mx-auto max-w-[90rem] px-4">
          <div className="flex h-14 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                to={searchId ? searchPath(searchId) : '/searches'}
                className="shrink-0 text-sm font-semibold tracking-tight sm:text-base"
              >
                <span className="hidden sm:inline">{APP_NAME}</span>
                <span className="sm:hidden">{APP_SHORT_NAME}</span>
              </Link>

              {showSearchNav && searches.length > 0 && (
                <SearchSwitcher
                  className="hidden sm:block sm:max-w-xs"
                  searches={searches}
                  currentSearchId={searchId}
                  onSelect={handleSearchSelect}
                  onManage={() => navigate('/searches?manage=1')}
                />
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {showSearchNav && (
                <button
                  type="button"
                  onClick={() => setNavOpen((open) => !open)}
                  className="rounded-md p-2 text-pine-200 hover:bg-white/10 hover:text-white sm:hidden"
                  aria-expanded={navOpen}
                  aria-controls="mobile-nav"
                  aria-label={navOpen ? 'Close menu' : 'Open menu'}
                >
                  {navOpen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
                    </svg>
                  )}
                </button>
              )}
              <Link
                to="/profile"
                className="hidden rounded-md px-2.5 py-1.5 text-sm text-pine-200 hover:bg-white/10 hover:text-white sm:block"
                title={user?.email}
              >
                Account
              </Link>
              {user?.isAdmin && (
                <Link
                  to="/admin"
                  className="hidden rounded-md px-2.5 py-1.5 text-sm text-pine-200 hover:bg-white/10 hover:text-white sm:block"
                >
                  Admin
                </Link>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-md px-2.5 py-1.5 text-sm text-pine-200 hover:bg-white/10 hover:text-white"
              >
                Log out
              </button>
            </div>
          </div>

          {showSearchNav && searches.length > 0 && (
            <div className="border-t border-pine-800 pb-3 pt-3 sm:hidden">
              <SearchSwitcher
                searches={searches}
                currentSearchId={searchId}
                onSelect={handleSearchSelect}
                onManage={() => navigate('/searches?manage=1')}
              />
            </div>
          )}

          {showSearchNav && (
            <nav className="hidden flex-wrap gap-1 pb-3 sm:flex">
              {currentSearch && (
                <span className="mr-2 self-center rounded bg-pine-800 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-pine-300">
                  {assetTypeMeta(assetType).singular}
                </span>
              )}
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={navLinkClass}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          )}
        </div>

        {showSearchNav && navOpen && (
          <nav
            id="mobile-nav"
            className="border-t border-pine-800 bg-pine-900 px-4 py-2 sm:hidden"
          >
            <div className="mx-auto max-w-[90rem] space-y-1">
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={navLinkClass}
                >
                  {item.label}
                </NavLink>
              ))}
              <Link
                to="/profile"
                className="block rounded-md px-3 py-2.5 text-sm font-medium text-pine-200 hover:bg-white/10 hover:text-white"
              >
                Account
              </Link>
              {user?.isAdmin && (
                <Link
                  to="/admin"
                  className="block rounded-md px-3 py-2.5 text-sm font-medium text-pine-200 hover:bg-white/10 hover:text-white"
                >
                  Admin
                </Link>
              )}
            </div>
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-[90rem] px-4 py-5 sm:py-8">{children}</main>
    </div>
  );
}
