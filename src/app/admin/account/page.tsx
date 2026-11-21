import { redirect } from "next/navigation";

export default function AdminAccountEntry() {
  redirect("/account/?account=owner");
}
