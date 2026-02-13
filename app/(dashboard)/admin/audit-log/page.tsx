import { getAuditLogs } from "@/lib/actions/audit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export const metadata = {
  title: "Audit Log | Flux Admin",
  description: "Track admin and security-sensitive actions",
};

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; action?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page || "1");
  const q = params.q || "";
  const action = params.action || "";

  const data = await getAuditLogs({
    page,
    limit: 25,
    search: q || undefined,
    action: action || undefined,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Audit Log</h1>
          <p className="text-muted-foreground mt-1">
            Security and admin activity records.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin">Back to Admin</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-1 gap-3 md:grid-cols-3" action="/admin/audit-log">
            <Input name="q" defaultValue={q} placeholder="Search action or user id..." />
            <Input name="action" defaultValue={action} placeholder="Action (e.g. ADMIN_USER_BANNED)" />
            <Button type="submit">Apply</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Entries ({data.total})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.logs.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No audit records found.
            </div>
          ) : (
            <>
              <div className="divide-y">
                {data.logs.map((log) => (
                  <div key={log.id} className="px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{log.action}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(log.createdAt)}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground space-y-1">
                      <p>Actor: {log.actorId || "N/A"}</p>
                      <p>Target: {log.targetUserId || "N/A"}</p>
                      {log.ipAddress && <p>IP: {log.ipAddress}</p>}
                      {log.details && (
                        <pre className="mt-2 overflow-auto rounded bg-muted p-2 text-xs">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  Page {data.page} of {data.pages}
                </p>
                <div className="flex gap-2">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    disabled={data.page <= 1}
                  >
                    <Link
                      href={`/admin/audit-log?page=${Math.max(1, data.page - 1)}${q ? `&q=${encodeURIComponent(q)}` : ""}${action ? `&action=${encodeURIComponent(action)}` : ""}`}
                    >
                      Previous
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    disabled={data.page >= data.pages}
                  >
                    <Link
                      href={`/admin/audit-log?page=${Math.min(data.pages, data.page + 1)}${q ? `&q=${encodeURIComponent(q)}` : ""}${action ? `&action=${encodeURIComponent(action)}` : ""}`}
                    >
                      Next
                    </Link>
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
