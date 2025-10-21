import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';

export const logAdminAction = async (action: string, entity: string, entityId: string, previousState: any, newState: any) => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error("No authenticated user found for audit logging.");
    return;
  }

  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('id, email, audit_logs')
    .eq('id', user.id)
    .single();

  if (fetchError) {
    console.error("Error fetching admin profile:", fetchError);
    return;
  }

  if (!profile || !profile.email) {
    console.error("Admin profile or email not found.");
    return;
  }

  const newLogEntry = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    action: action,
    entity: entity,
    entity_id: entityId,
    admin_id: user.id,
    admin_email: profile.email,
    previous_state: previousState,
    new_state: newState,
  };

  const updatedAuditLogs = profile.audit_logs ? [...profile.audit_logs, newLogEntry] : [newLogEntry];

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ audit_logs: updatedAuditLogs })
    .eq('id', user.id);

  if (updateError) {
    console.error("Error updating audit logs:", updateError);
  }
};
