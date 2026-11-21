import { redirect } from "next/navigation";

export default function PartnerAccountEntry() {
  redirect("/account/?account=partner");
}
