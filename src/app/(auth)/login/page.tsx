import { AuthForm } from "@/components/auth-form";
import { getTranslator, pageMetadata } from "@/lib/i18n/server";

export const generateMetadata = () => pageMetadata("meta.login");

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const callbackFailed = (await searchParams).error === "auth_callback";
  const { t } = await getTranslator();
  return <AuthForm mode="login" initialError={callbackFailed ? t("auth.callbackFailed") : ""} />;
}
