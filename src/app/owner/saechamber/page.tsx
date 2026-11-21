import { redirect } from "next/navigation";

export default function LegacyOwnerDashboardRedirect() {
  redirect("/owner/");
}
