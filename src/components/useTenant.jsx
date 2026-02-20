import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Returns the current user and a helper to scope entity queries to this user's tenant.
 * Usage:
 *   const { user, tenantFilter } = useTenant();
 *   base44.entities.Connection.filter(tenantFilter)
 *
 * Since Base44 already scopes `created_by` per user for non-admin roles,
 * this also returns a `scopedList` helper to filter lists client-side for safety.
 */
export function useTenant() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me()
      .then(u => { setUser(u); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Scope a list of records to the current user
  const scope = (records) => {
    if (!user) return records;
    // admins can see everything; regular users only see their own
    if (user.role === "admin") return records;
    return records.filter(r => r.created_by === user.email);
  };

  return { user, loading, scope };
}