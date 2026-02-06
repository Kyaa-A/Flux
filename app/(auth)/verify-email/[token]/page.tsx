"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, TrendingUp, CheckCircle2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { verifyEmail } from "@/lib/actions/auth";

export default function VerifyEmailPage() {
  const params = useParams();
  const token = params.token as string;

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function verify() {
      try {
        const result = await verifyEmail(token);

        if (result && typeof result === "object" && "error" in result && result.error) {
          setStatus("error");
          setErrorMessage(result.error);
          return;
        }

        setStatus("success");
      } catch {
        setStatus("error");
        setErrorMessage("Something went wrong. Please try again.");
      }
    }

    verify();
  }, [token]);

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-zinc-900 overflow-hidden dark:bg-zinc-950">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl opacity-50" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl opacity-50" />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20" />

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <TrendingUp className="w-7 h-7 text-zinc-900" />
            </div>
            <span className="text-3xl font-bold tracking-tight">Flux</span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-bold leading-tight mb-6 text-white">
            Verifying your
            <span className="block bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-400 bg-clip-text text-transparent">
              email address
            </span>
          </h1>

          <p className="text-lg text-zinc-300 max-w-md">
            Almost there! We&apos;re confirming your email to secure your account.
          </p>
        </div>
      </div>

      {/* Right side - Status */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md border-border bg-card/50 backdrop-blur-sm shadow-xl">
          <CardHeader className="space-y-1 text-center">
            <div className="lg:hidden flex items-center justify-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center shadow-lg">
                <TrendingUp className="w-6 h-6 text-zinc-900" />
              </div>
              <span className="text-2xl font-bold">Flux</span>
            </div>
            <CardTitle className="text-2xl font-bold">
              {status === "loading" && "Verifying..."}
              {status === "success" && "Email verified!"}
              {status === "error" && "Verification failed"}
            </CardTitle>
            <CardDescription>
              {status === "loading" && "Please wait while we verify your email."}
              {status === "success" &&
                "Your email has been successfully verified."}
              {status === "error" && errorMessage}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex justify-center">
                {status === "loading" && (
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                  </div>
                )}
                {status === "success" && (
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </div>
                )}
                {status === "error" && (
                  <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                    <XCircle className="w-8 h-8 text-destructive" />
                  </div>
                )}
              </div>

              {status === "success" && (
                <Button
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                  asChild
                >
                  <Link href="/login">Sign in to your account</Link>
                </Button>
              )}

              {status === "error" && (
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/login">Back to sign in</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
