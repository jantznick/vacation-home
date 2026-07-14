import { useCallback, useEffect, useRef, useState } from 'react';
import {
  SCENARIO_LIST,
  getStoredScenarioId,
  storeScenarioId,
} from '../lib/marketingScenarios';

const SCENARIO_ORDER = SCENARIO_LIST.map((s) => s.id);
const USER_PICKED_KEY = 'marketing-scenario-user-picked';
const AUTO_CYCLE_MS = 3000;

function hasUserPickedScenario() {
  try {
    return sessionStorage.getItem(USER_PICKED_KEY) === '1';
  } catch {
    return false;
  }
}

function markScenarioPicked() {
  try {
    sessionStorage.setItem(USER_PICKED_KEY, '1');
  } catch {
    // ignore
  }
}

export default function VacationTypeSelector({ value, onChange, theme }) {
  const valueRef = useRef(value);
  valueRef.current = value;

  const [autoCycling, setAutoCycling] = useState(() => {
    if (hasUserPickedScenario()) return false;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return false;
    }
    return true;
  });

  const stopAutoCycle = useCallback(() => {
    setAutoCycling(false);
    markScenarioPicked();
  }, []);

  useEffect(() => {
    if (!autoCycling) return undefined;

    const interval = setInterval(() => {
      const idx = SCENARIO_ORDER.indexOf(valueRef.current);
      const next = SCENARIO_ORDER[(idx + 1) % SCENARIO_ORDER.length];
      onChange(next);
    }, AUTO_CYCLE_MS);

    return () => clearInterval(interval);
  }, [autoCycling, onChange]);

  useEffect(() => {
    if (!autoCycling) return undefined;

    const onScroll = () => {
      if (window.scrollY > 48) stopAutoCycle();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [autoCycling, stopAutoCycle]);

  const handleSelect = (id) => {
    stopAutoCycle();
    onChange(id);
    storeScenarioId(id);
  };

  return (
    <div className="mt-5 min-w-0">
      <p className={`mb-2 text-sm font-medium ${theme?.selectorLabel || 'text-pine-800'}`}>
        Select your vacation
      </p>

      <div
        className={`inline-flex max-w-full flex-wrap gap-1.5 rounded-xl p-1.5 ${
          theme?.selectorGroup || 'bg-white shadow-md ring-1 ring-pine-900/10'
        }`}
        role="group"
        aria-label="Select your vacation type"
        onMouseEnter={autoCycling ? stopAutoCycle : undefined}
        onFocus={autoCycling ? stopAutoCycle : undefined}
      >
        {SCENARIO_LIST.map((scenario) => {
          const selected = value === scenario.id;
          const activeTheme = scenario.theme;
          return (
            <button
              key={scenario.id}
              type="button"
              aria-pressed={selected}
              onClick={() => handleSelect(scenario.id)}
              onFocus={() => {
                if (autoCycling) stopAutoCycle();
              }}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                selected
                  ? activeTheme.selectorActive
                  : activeTheme.selectorIdle
              }`}
            >
              <span aria-hidden>{scenario.emoji}</span>
              {scenario.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { getStoredScenarioId };
