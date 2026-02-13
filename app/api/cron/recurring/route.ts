import { NextRequest, NextResponse } from "next/server";
import { processRecurringTransactions } from "@/lib/recurring-processor";
import { createBudgetAlertNotifications } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Require a secret to prevent unauthorized calls (fail-closed)
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processRecurringTransactions();

    // Also check and create budget alert notifications
    const alerts = await createBudgetAlertNotifications();

    return NextResponse.json({
      success: true,
      processed: result.processed,
      budgetAlerts: alerts.created,
    });
  } catch (error) {
    console.error("Cron recurring error:", error);
    return NextResponse.json(
      { error: "Failed to process recurring transactions" },
      { status: 500 }
    );
  }
}
