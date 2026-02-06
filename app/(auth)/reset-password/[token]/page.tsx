"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import {
  Loader2,
  Eye,
  EyeOff,
  Check,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  resetPasswordSchema,
  type ResetPasswordFormData,
} from "@/lib/validations";
import { resetPassword } from "@/lib/actions/auth";

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isReset, setIsReset] = useState(false);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const password = form.watch("password");
  const passwordChecks = {
    length: password?.length >= 8,
    uppercase: /[A-Z]/.test(password || ""),
    lowercase: /[a-z]/.test(password || ""),
    number: /[0-9]/.test(password || ""),
  };

  async function onSubmit(data: ResetPasswordFormData) {
    setIsLoading(true);
    try {
      const result = await resetPassword(token, data.password);

      if (result && typeof result === "object" && "error" in result && result.error) {
        toast.error(result.error);
        return;
      }

      setIsReset(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-zinc-900 overflow-hidden dark:bg-zinc-950">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl opacity-50" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl opacity-50" />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20" />

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 text-white">
          <div className="flex items-center gap-3 mb-8">
            <Image src="/flux.png" alt="Flux" width={48} height={48} className="rounded-xl shadow-lg shadow-emerald-500/20" />
            <span className="text-3xl font-bold tracking-tight">Flux</span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-bold leading-tight mb-6 text-white">
            Set a new
            <span className="block bg-gradient-to-r from-cyan-400 via-violet-400 to-emerald-400 bg-clip-text text-transparent">
              secure password
            </span>
          </h1>

          <p className="text-lg text-zinc-300 max-w-md">
            Choose a strong password to keep your financial data safe and secure.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md border-border bg-card/50 backdrop-blur-sm shadow-xl">
          <CardHeader className="space-y-1 text-center">
            <div className="lg:hidden flex items-center justify-center gap-2 mb-4">
              <Image src="/flux.png" alt="Flux" width={40} height={40} className="rounded-xl" />
              <span className="text-2xl font-bold">Flux</span>
            </div>
            <CardTitle className="text-2xl font-bold">
              {isReset ? "Password reset!" : "Reset your password"}
            </CardTitle>
            <CardDescription>
              {isReset
                ? "Your password has been successfully reset."
                : "Enter your new password below."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isReset ? (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  You can now sign in with your new password.
                </p>
                <Button
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                  onClick={() => router.push("/login")}
                >
                  Go to sign in
                </Button>
              </div>
            ) : (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              className="bg-background border-input placeholder:text-muted-foreground focus-visible:ring-primary/30 pr-10"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-foreground"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          {[
                            { key: "length", label: "8+ characters" },
                            { key: "uppercase", label: "Uppercase" },
                            { key: "lowercase", label: "Lowercase" },
                            { key: "number", label: "Number" },
                          ].map((check) => (
                            <div
                              key={check.key}
                              className={`flex items-center gap-1 ${
                                passwordChecks[
                                  check.key as keyof typeof passwordChecks
                                ]
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-muted-foreground"
                              }`}
                            >
                              <Check className="w-3 h-3" />
                              <span>{check.label}</span>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            className="bg-background border-input placeholder:text-muted-foreground focus-visible:ring-primary/30"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md dark:shadow-none"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Resetting...
                      </>
                    ) : (
                      "Reset password"
                    )}
                  </Button>
                </form>
              </Form>
            )}

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
