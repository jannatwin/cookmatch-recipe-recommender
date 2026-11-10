import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Sign in · CookMatch" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const callbackFailed = (await searchParams).error === "auth_callback";
  return <AuthForm mode="login" initialError={callbackFailed ? "That confirmation link is invalid or has expired. Sign in, or register again to get a new link." : ""} />;
}
