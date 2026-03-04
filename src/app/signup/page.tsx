import { redirect } from "next/navigation";

export default function SignupRedirect() {
  redirect("/get-started");
}
