import { getMonthlyHistory } from "@/lib/actions/transactions";
import { IncomeExpenseBar } from "./charts/income-expense-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export async function IncomeVsExpense() {
  const data = await getMonthlyHistory();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Income vs Expenses (Last 6 Months)</CardTitle>
      </CardHeader>
      <CardContent>
        <IncomeExpenseBar data={data} />
      </CardContent>
    </Card>
  );
}
