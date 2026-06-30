import { useState, useTransition } from "react";
import { useTranslation } from "react-i18next";
import { ROLES, type Profile, type Role } from "@/lib/types";
import { setUserRole, setUserAccessRoles } from "@/spa/data/writes";
import AccessRolePicker from "@/components/AccessRolePicker";

export default function UsersManager({
  users,
  currentUserId,
}: {
  users: Profile[];
  currentUserId: string;
}) {
  const { t } = useTranslation();
  const [rows, setRows] = useState(users);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function changeRole(id: string, role: Role) {
    const prev = rows;
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, role } : r)));
    setError(null);
    startTransition(async () => {
      const res = await setUserRole(id, role);
      if (!res.ok) {
        setRows(prev);
        setError(res.error);
      }
    });
  }

  function changeAccess(id: string, manual_access_roles: string[]) {
    const prev = rows;
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, manual_access_roles } : r)));
    setError(null);
    startTransition(async () => {
      const res = await setUserAccessRoles(id, manual_access_roles);
      if (!res.ok) {
        setRows(prev);
        setError(res.error);
      }
    });
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-ink-line p-6 text-center text-ink-mut">
        {t("admin.users.empty")}
      </p>
    );
  }

  return (
    <div>
      {error && <p className="mb-3 text-[13px] text-red-600">{error}</p>}
      <table className="w-full overflow-hidden rounded-lg border border-ink-line text-sm">
        <thead className="bg-ink-bg text-left text-[12px] uppercase tracking-wide text-ink-mut">
          <tr>
            <th className="px-4 py-2 font-medium">{t("admin.users.colUser")}</th>
            <th className="px-4 py-2 font-medium">{t("admin.users.colRole")}</th>
            <th className="px-4 py-2 font-medium">
              {t("admin.users.colEntitlements")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => {
            const isSelf = u.id === currentUserId;
            const synced = (u.access_roles ?? []).filter(
              (r) => !(u.manual_access_roles ?? []).includes(r),
            );
            return (
              <tr key={u.id} className="border-t border-ink-line align-top">
                <td className="px-4 py-2">
                  {u.email ?? u.id.slice(0, 8)}
                  {isSelf && (
                    <span className="ml-2 text-[11px] text-ink-mut">
                      {t("admin.users.you")}
                    </span>
                  )}
                  <span className="block text-[11px] text-ink-mut">
                    {t("admin.users.joined", {
                      date: new Date(u.created_at).toLocaleDateString(),
                    })}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <select
                    value={u.role}
                    disabled={isSelf || pending}
                    onChange={(e) => changeRole(u.id, e.target.value as Role)}
                    className="rounded border border-ink-line bg-ink-panel px-2 py-1 text-[13px] outline-none focus:border-ink-accent disabled:opacity-60"
                    title={isSelf ? t("admin.users.cantChangeOwnRole") : undefined}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <AccessRolePicker
                    value={u.manual_access_roles ?? []}
                    onChange={(roles) => changeAccess(u.id, roles)}
                  />
                  {synced.length > 0 && (
                    <span className="mt-1 block text-[11px] text-ink-mut">
                      {t("admin.users.fromSso", { roles: synced.join(", ") })}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-2 text-[12px] text-ink-mut">
        {t("admin.users.footnote")}
      </p>
    </div>
  );
}
