import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  getColumnPreferences,
  savePOColumnPreferences,
  saveContainerColumnPreferences,
} from '../services/columnPreferences.service';

export interface ColumnDef {
  key: string;
  label: string;
  /** Columns marked `locked` are always visible and skip the checkbox toggle (e.g. actions). */
  locked?: boolean;
}

type PrefModule = 'po' | 'container';

const PREF_FIELD: Record<PrefModule, string> = {
  po: 'po_columns',
  container: 'container_columns',
};

/**
 * Manages per-user column visibility for a table (Purchase Order / Container).
 * Loads saved preferences on mount (GET /auth/me/column-preferences), lets the
 * caller toggle columns locally, and persists on demand via `saveVisibility`
 * (PATCH /auth/users/{user_id}). Defaults to all columns visible.
 */
export function useColumnVisibility(
  module: PrefModule,
  allColumns: ColumnDef[],
  userId?: string | null,
) {
  const defaultVisibility = useMemo(() => {
    const map: Record<string, boolean> = {};
    allColumns.forEach((col) => {
      map[col.key] = true;
    });
    return map;
  }, [allColumns]);

  const [visibility, setVisibility] = useState<Record<string, boolean>>(
    defaultVisibility,
  );
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getColumnPreferences()
      .then((prefs) => {
        if (cancelled) return;
        const saved = prefs?.[PREF_FIELD[module]] as
          | Record<string, boolean>
          | undefined;
        if (saved && typeof saved === 'object') {
          setVisibility({ ...defaultVisibility, ...saved });
        }
      })
      .catch(() => {
        // No saved preferences (or request failed) — keep default (all visible)
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module]);

  const toggleColumn = useCallback((key: string) => {
    setVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const isVisible = useCallback(
    (key: string) => visibility[key] !== false,
    [visibility],
  );

  const saveVisibility = useCallback(async () => {
    if (!userId) {
      toast.error('Unable to save column preferences: no user found');
      return;
    }
    setSaving(true);
    try {
      if (module === 'po') {
        await savePOColumnPreferences(userId, visibility);
      } else {
        await saveContainerColumnPreferences(userId, visibility);
      }
      toast.success('Column preferences saved');
    } catch (err) {
      console.error('Failed to save column preferences:', err);
      toast.error('Failed to save column preferences');
    } finally {
      setSaving(false);
    }
  }, [module, userId, visibility]);

  return {
    visibility,
    isVisible,
    toggleColumn,
    saveVisibility,
    saving,
    loaded,
  };
}
