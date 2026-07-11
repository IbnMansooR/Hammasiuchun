import { getCurrentUser } from "@/lib/userAuth";
import { paymeEnabled } from "@/lib/payme";
import { clickEnabled } from "@/lib/click";
import CartClient from "./CartClient";

export const metadata = { title: "Savatcha" };

export default async function CartPage() {
  const user = await getCurrentUser();
  return <CartClient loggedIn={!!user} paymeEnabled={paymeEnabled} clickEnabled={clickEnabled} />;
}
