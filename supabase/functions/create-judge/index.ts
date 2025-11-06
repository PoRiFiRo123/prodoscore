import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface CreateJudgePayload {
  fullName: string;
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
    const { fullName }: CreateJudgePayload = await req.json();

    if (!fullName) {
      return new Response(JSON.stringify({ error: 'Full name is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Generate a unique email for the judge
    const timestamp = Date.now();
    const sanitizedName = fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const email = `judge-${sanitizedName}-${timestamp}@judges.prodoscore.local`;

    // Generate a random password
    const password = `Judge${timestamp}!`;

    // Create auth user
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      user_metadata: { full_name: fullName },
      email_confirm: true,
    });

    if (userError) {
      throw new Error(`Failed to create auth user: ${userError.message}`);
    }

    if (!user || !user.user) {
      throw new Error('User creation failed - no user returned');
    }

    const userId = user.user.id;

    // Update profile with full name
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ full_name: fullName, email: email })
      .eq('id', userId);

    if (profileError) {
      // Rollback: delete the created user
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(`Failed to update profile: ${profileError.message}`);
    }

    // Assign judge role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: userId, role: 'judge' });

    if (roleError) {
      // Rollback: delete the created user
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(`Failed to assign judge role: ${roleError.message}`);
    }

    return new Response(JSON.stringify({
      message: 'Judge created successfully',
      judgeId: userId,
      email: email
    }), {
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