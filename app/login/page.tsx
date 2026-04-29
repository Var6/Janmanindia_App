import { isGoogleLoginConfigured } from "@/lib/google-login";
import LoginForm from "./LoginForm";

/** Server-rendered shell — checks env once at request time and only renders
 *  the Google sign-in button when an OAuth client is actually configured.
 *  The form itself stays client-side for the email/password flow. */
export default function LoginPage() {
  return <LoginForm googleEnabled={isGoogleLoginConfigured()} />;
}
