import { supabase } from "@/lib/supabase";

export async function getUserById(id: string) {
  const { data } = await supabase
    .from("users")
    .select("id, nome, role")
    .eq("id", id)
    .single();

  if (!data) return null;

  return data;
}