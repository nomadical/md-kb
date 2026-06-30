import { Trans, useTranslation } from "react-i18next";
import { useAuth } from "@/spa/auth/AuthProvider";
import { useAsync } from "@/spa/data/useAsync";
import { fetchUsers } from "@/spa/data/admin";
import UsersManager from "@/components/UsersManager";
import Loading from "@/spa/pages/Loading";

/** SPA port of src/app/admin/users/page.tsx. */
export default function UsersPage() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { data: users, loading } = useAsync(fetchUsers, []);
  if (loading || !users || !session) return <Loading />;

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <h1 className="text-xl font-semibold">{t("admin.users.title")}</h1>
      <p className="mt-1 text-[13px] text-ink-mut">
        <Trans
          i18nKey="admin.users.rolesIntro"
          components={{
            admin: <strong />,
            editor: <strong />,
            reviewer: <strong />,
            viewer: <strong />,
          }}
        />
      </p>
      <div className="mt-6">
        <UsersManager users={users} currentUserId={session.user.id} />
      </div>
    </div>
  );
}
