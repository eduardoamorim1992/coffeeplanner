import { supabase } from "@/lib/supabase";

/** IDs de usuários que aprovaram o pedido do solicitante para ver as atividades deles. */
export async function fetchApprovedShareTargetIds(
  requesterId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("activity_share_requests")
    .select("target_id")
    .eq("requester_id", requesterId)
    .eq("status", "approved");

  if (error) {
    console.warn("activity_share_requests (approved):", error.message);
    return [];
  }
  return (data || []).map((r) => r.target_id).filter(Boolean) as string[];
}
