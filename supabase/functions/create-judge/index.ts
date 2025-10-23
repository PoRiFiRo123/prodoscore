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
    const { data: { session } } = await supabaseAdmin.auth.getSession();

    // Call your existing create-judge logic here, e.g., the function that handles profile creation and role assignment.
    // For this example, I'll simulate a basic response as the actual create-judge logic is not in this file.
    // You would replace this with the actual logic to create the judge.

    const { fullName }: CreateJudgePayload = await req.json();

    if (!fullName) {
      return new Response(JSON.stringify({ error: 'Full name is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Here you would typically call your database to create the judge
    // For now, let's assume a successful creation and return a dummy judgeId
    const judgeId = `judge-${Date.now()}`;
    
    // In a real scenario, you'd integrate with your database to create the judge profile
    // and assign the 'judge' role. For example:
    // const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
    //   email: 'generated-email@example.com', // or generate unique emails
    //   password: 'temporary-password',
    //   user_metadata: { full_name: fullName },
    //   email_confirm: true,
    // });

    // if (userError) { throw userError; }

    // await supabaseAdmin.from('profiles').update({ full_name: fullName }).eq('id', user.id);
    // await supabaseAdmin.from('user_roles').insert({ user_id: user.id, role: 'judge' });

    return new Response(JSON.stringify({ message: 'Judge created successfully', judgeId: judgeId }), {
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