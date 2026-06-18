import { supabase } from "@/integrations/supabase/client";

export async function writeAudit(action: string, entity: string, entityId: string | null, details?: Record<string, unknown>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.rpc("log_audit", {
    _action: action,
    _entity: entity,
    _entity_id: entityId ?? "",
    _details: details ? (JSON.parse(JSON.stringify(details)) as never) : null,
  });
}
