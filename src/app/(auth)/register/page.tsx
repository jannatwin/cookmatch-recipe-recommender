import { AuthForm } from "@/components/auth-form";
import { pageMetadata } from "@/lib/i18n/server";

export const generateMetadata = () => pageMetadata("meta.register");

export default function RegisterPage() {
  return <AuthForm mode="register" />;
}
