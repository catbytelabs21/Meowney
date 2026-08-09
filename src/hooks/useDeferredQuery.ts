import { useCallback, useEffect, useState } from 'react';

type DeferredQueryState<T> = {
  data: T;
  error: unknown;
  isLoading: boolean;
  reload: () => void;
};

type IdleTaskCancel = () => void;

type IdleGlobal = typeof globalThis & {
  cancelIdleCallback?: (handle: number) => void;
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
};

function scheduleIdleTask(callback: () => void): IdleTaskCancel {
  const idleGlobal = globalThis as IdleGlobal;

  if (typeof idleGlobal.requestIdleCallback === 'function') {
    const handle = idleGlobal.requestIdleCallback(callback, { timeout: 250 });
    return () => idleGlobal.cancelIdleCallback?.(handle);
  }

  const timeout = setTimeout(callback, 0);
  return () => clearTimeout(timeout);
}

export function useDeferredQuery<T>(query: () => T, initialData: T): DeferredQueryState<T> {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setReloadKey((current) => current + 1);
  }, []);

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    setError(null);

    const cancelIdleTask = scheduleIdleTask(() => {
      try {
        const result = query();
        if (isActive) {
          setData(result);
        }
      } catch (queryError) {
        if (isActive) {
          setError(queryError);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    });

    return () => {
      isActive = false;
      cancelIdleTask();
    };
  }, [query, reloadKey]);

  return { data, error, isLoading, reload };
}
