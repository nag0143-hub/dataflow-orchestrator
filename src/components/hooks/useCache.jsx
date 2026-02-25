import { useEffect, useRef, useState } from "react";

/**
 * Stale-while-revalidate caching hook
 * Returns cached data immediately while fetching fresh data in background
 */
export function useCache(key, fetcher, options = {}) {
  const { staleTime = 5 * 60 * 1000, cacheTime = 30 * 60 * 1000 } = options;
  const cacheRef = useRef(new Map());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cached = cacheRef.current.get(key);
    const now = Date.now();

    // Return cached data if still fresh
    if (cached && now - cached.timestamp < staleTime) {
      setData(cached.data);
      setLoading(false);
      return;
    }

    // Revalidate in background
    let isMounted = true;
    setLoading(true);

    fetcher()
      .then(freshData => {
        if (isMounted) {
          cacheRef.current.set(key, {
            data: freshData,
            timestamp: Date.now(),
          });
          setData(freshData);
          setError(null);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err);
          // Fall back to stale cache if available
          if (cached) setData(cached.data);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    // Cleanup stale cache
    const cleanup = () => {
      if (cacheRef.current.get(key)?.timestamp < now - cacheTime) {
        cacheRef.current.delete(key);
      }
    };
    const timer = setTimeout(cleanup, cacheTime);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [key, fetcher, staleTime, cacheTime]);

  return { data, loading, error };
}