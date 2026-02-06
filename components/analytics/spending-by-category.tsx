import { getCategorySpending } from "@/lib/actions/categories";
import { CategoryPie } from "./charts/category-pie";

interface SpendingByCategoryProps {
  type: "INCOME" | "EXPENSE";
}

export async function SpendingByCategory({ type }: SpendingByCategoryProps) {
  const spending = await getCategorySpending("month", type);
  
  const chartData = spending
    .filter(item => item.spent > 0)
    .map(item => ({
      name: item.name,
      value: item.spent,
      color: item.color,
    }));

  return <CategoryPie data={chartData} />;
}
