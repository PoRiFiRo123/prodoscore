import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface DeleteJudgePayload {
  judgeId: string;
}

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
    },
  });

  try {
    const { judgeId }: DeleteJudgePayload = await req.json();

    if (!judgeId) {
      return new Response(JSON.stringify({ error: 'Judge ID is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Delete from judge_assignments first
    const { error: assignmentError } = await supabaseAdmin
      .from('judge_assignments')
      .delete()
      .eq('judge_id', judgeId);

    if (assignmentError) {
      console.error('Error deleting judge assignments:', assignmentError);
      throw new Error('Failed to delete judge assignments');
    }

    // Delete from user_roles
    const { error: userRoleError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', judgeId)
      .eq('role', 'judge');

    if (userRoleError) {
      console.error('Error deleting user role:', userRoleError);
      throw new Error('Failed to delete judge user role');
    }

    // Finally, delete from profiles
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', judgeId);

    if (profileError) {
      console.error('Error deleting judge profile:', profileError);
      throw new Error('Failed to delete judge profile');
    }

    return new Response(JSON.stringify({ message: 'Judge and associated data deleted successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Request processing error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
