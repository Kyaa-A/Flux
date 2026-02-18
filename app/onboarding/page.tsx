import { auth } from "@/lib/auth";
import { getOnboardingData } from "@/lib/actions/onboarding";
import { OnboardingWizard } from "./_components/onboarding-wizard";

export default async function OnboardingPage() {
  const session = await auth();
  const { wallet, categories } = await getOnboardingData();

  return (
    <OnboardingWizard
      defaultCurrency={session?.user?.currency ?? "USD"}
      defaultLocale={session?.user?.locale ?? "en-US"}
      defaultWallet={wallet}
      categories={categories}
    />
  );
}
