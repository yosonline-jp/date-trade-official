import { FormMessage, Message } from "@/components/form-message";
import SignupForm from "@/components/pages/signup/signup-form";

export default async function Signup(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;
  if ("success" in searchParams || "error" in searchParams) {
    return <FormMessage message={searchParams} />;
  }

  return <SignupForm />;
}
