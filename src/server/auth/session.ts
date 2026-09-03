import "server-only";
import { redirect } from "next/navigation";
import { authClient } from "./client";

export async function requireUser() {
  const client = await authClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) redirect("/auth/entrar");
  return { client, user: data.user };
}
