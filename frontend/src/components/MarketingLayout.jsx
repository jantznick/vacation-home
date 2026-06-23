import { Link } from 'react-router-dom';
import { APP_NAME, APP_DOMAIN } from '../lib/brand';
import MarketingLink from './MarketingLink';
import { DEFAULT_SCENARIO_ID, MARKETING_SCENARIOS } from '../lib/marketingScenarios';

const DEFAULT_THEME = MARKETING_SCENARIOS[DEFAULT_SCENARIO_ID].theme;

export default function MarketingLayout({ children, showFooter = true, theme = DEFAULT_THEME }) {
  return (
    <div className={`flex min-h-screen min-w-0 flex-col overflow-x-clip ${theme.pageBg}`}>
      <header className={`sticky top-0 z-50 border-b bg-white/90 backdrop-blur-md ${theme.headerBorder}`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-6">
          <Link to="/" className="group flex min-w-0 shrink items-center gap-2">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${theme.stepCircle}`}>
              VH
            </span>
            <span className={`truncate text-sm font-semibold text-pine-900 sm:text-base lg:text-lg ${theme.logoHover}`}>
              {APP_NAME}
            </span>
          </Link>
          <nav className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
            <a
              href="/#pricing"
              className={`hidden cursor-pointer rounded-lg px-3 py-2 text-sm font-medium sm:inline-block ${theme.navLink}`}
            >
              Pricing models
            </a>
            <MarketingLink to="/login" variant="ghost" className={`min-h-10 px-2 sm:px-3 ${theme.navLink}`}>
              Sign in
            </MarketingLink>
            <MarketingLink
              to="/register"
              variant="primary"
              className={`min-h-10 px-3 text-sm sm:px-4 ${theme.primaryBtn}`}
            >
              Get started
            </MarketingLink>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      {showFooter && (
        <footer className={`border-t bg-white ${theme.headerBorder}`}>
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
            <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-semibold text-pine-900">{APP_NAME}</p>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-pine-600">
                  Shared vacation-home research with pricing models trained on your listings —
                  regions, drive times, and notes in one workspace.
                </p>
              </div>
              <div className="flex flex-wrap gap-x-10 gap-y-6 text-sm">
                <div className="space-y-2">
                  <p className="font-medium text-pine-800">Product</p>
                  <ul className="space-y-1.5 text-pine-600">
                    <li><a href="/#pricing" className="cursor-pointer hover:text-pine-900">Pricing models</a></li>
                    <li><Link to="/register" className="cursor-pointer hover:text-pine-900">Create account</Link></li>
                    <li><Link to="/login" className="cursor-pointer hover:text-pine-900">Sign in</Link></li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="font-medium text-pine-800">Company</p>
                  <ul className="space-y-1.5 text-pine-600">
                    <li><Link to="/about" className="cursor-pointer hover:text-pine-900">About</Link></li>
                    <li><Link to="/contact" className="cursor-pointer hover:text-pine-900">Contact</Link></li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="font-medium text-pine-800">Legal</p>
                  <ul className="space-y-1.5 text-pine-600">
                    <li><Link to="/privacy" className="cursor-pointer hover:text-pine-900">Privacy</Link></li>
                    <li><Link to="/terms" className="cursor-pointer hover:text-pine-900">Terms</Link></li>
                  </ul>
                </div>
              </div>
            </div>
            <p className="mt-8 border-t border-pine-100 pt-5 text-xs text-pine-500">
              © {new Date().getFullYear()} {APP_NAME}. {APP_DOMAIN}
              {' · '}
              <Link to="/contact" className="hover:text-pine-700">Contact</Link>
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}
