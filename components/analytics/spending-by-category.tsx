import { getCategorySpendingByRange } from "@/lib/actions/analytics";
import { CategoryPie } from "./charts/category-pie";

interface SpendingByCategoryProps {
  type: "INCOME" | "EXPENSE";
  startDate: Date;
  endDate: Date;
}

export async function SpendingByCategory({ type, startDate, endDate }: SpendingByCategoryProps) {
  const spending = await getCategorySpendingByRange(startDate, endDate, type);

  const chartData = spending
    .filter(item => item.spent > 0)
    .map(item => ({
      name: item.name,
      value: item.spent,
      color: item.color,
    }));

  return <CategoryPie data={chartData} />;
}
