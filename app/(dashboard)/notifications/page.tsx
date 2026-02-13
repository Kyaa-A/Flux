import { getNotificationsPaginated } from "@/lib/actions/notifications";
import { NotificationsPageClient } from "./notifications-page-client";

export const metadata = {
  title: "Notifications | Flux",
  description: "View your notification history",
};

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page || "1");
  const data = await getNotificationsPaginated({ page, limit: 20 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Notifications</h1>
        <p className="text-muted-foreground mt-1">
          Full history of account and finance alerts.
        </p>
      </div>
      <NotificationsPageClient
        notifications={data.notifications}
        page={data.page}
        pages={data.pages}
      />
    </div>
  );
}
