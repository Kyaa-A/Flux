import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, CheckCircle2, Circle } from "lucide-react";

interface LinkedSignInMethodsProps {
  methods: {
    hasCredentials: boolean;
    hasGoogle: boolean;
    hasGithub: boolean;
  };
}

function MethodRow({
  label,
  connected,
}: {
  label: string;
  connected: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <span className="text-sm font-medium">{label}</span>
      {connected ? (
        <Badge variant="outline" className="text-emerald-600 border-emerald-600">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Connected
        </Badge>
      ) : (
        <Badge variant="secondary">
          <Circle className="h-3 w-3 mr-1" />
          Not linked
        </Badge>
      )}
    </div>
  );
}

export function LinkedSignInMethods({ methods }: LinkedSignInMethodsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          Linked Sign-In Methods
        </CardTitle>
        <CardDescription>
          Accounts connected to this profile. Use the same email across methods to keep one account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <MethodRow label="Email & Password" connected={methods.hasCredentials} />
        <MethodRow label="Google" connected={methods.hasGoogle} />
        <MethodRow label="GitHub" connected={methods.hasGithub} />
      </CardContent>
    </Card>
  );
}
