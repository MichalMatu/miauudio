import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';

type SetValue<T> = Dispatch<SetStateAction<T>>;

/**
 * A custom React hook to manage state with localStorage persistence.
 *
 * @template T
 * @param {string} key - The key under which the value is stored in localStorage.
 * @param {T} fallback - The fallback value to use if there is no value in localStorage.
 * @returns {[T, SetValue<T>]} An array containing the stateful value and a function to update it.
 */
export function useLocalStorage<T>(key: string, fallback: T): [T, SetValue<T>] {
  const [value, setValue] = useState(fallback);
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;

  useEffect(() => {
    let restored = fallbackRef.current;
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) restored = JSON.parse(stored) as T;
    } catch {
      // Corrupt or unavailable storage should not prevent in-memory use.
    }
    setValue(restored);
    setHydratedKey(key);
  }, [key]);

  useEffect(() => {
    if (hydratedKey !== key) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Keep working in memory if persistent storage is unavailable.
    }
  }, [hydratedKey, key, value]);

  return [value, setValue];
}
