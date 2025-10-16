import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface CreateJudgePayload {
  fullName: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*', // Or specific origins, e.g., your frontend URL
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // Ensure these environment variables are set in your Supabase project
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
    },
  });

  let userId: string | null = null; // To keep track for potential rollback

  try {
    const { fullName } = await req.json() as CreateJudgePayload;

    if (!fullName) {
      return new Response(JSON.stringify({ error: 'Full name is required' }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        status: 400,
      });
    }

    // Generate a unique dummy email and a strong random password
    const uniqueId = crypto.randomUUID();
    const dummyEmail = `judge-${uniqueId}@example.com`;
    const randomPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);

    // 1. Create a new user in auth.users using the service role key.
    // This will trigger the public.handle_new_user function,
    // which will create a profile entry with the dummy email.
    const { data: userAuth, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: dummyEmail,
      password: randomPassword,
      email_confirm: true, // Auto-confirm the dummy email
    });

    if (authError) {
      console.error("Auth creation error:", authError);
      return new Response(JSON.stringify({ error: authError.message }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        status: 500,
      });
    }

    if (!userAuth?.user) {
      return new Response(JSON.stringify({ error: 'User not created' }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        status: 500,
      });
    }

    userId = userAuth.user.id; // Store userId for potential rollback

    // 2. Update the profile that was automatically created by handle_new_user.
    // Set email to NULL and assign the correct full name.
    const { data: updatedProfile, error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({
        email: null, // Explicitly set email to NULL as per your requirement
        full_name: fullName,
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateProfileError) {
      console.error("Profile update error:", updateProfileError);
      await supabaseAdmin.auth.admin.deleteUser(userId); // Rollback user creation
      return new Response(JSON.stringify({ error: updateProfileError.message }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        status: 500,
      });
    }

    // 3. Assign the 'judge' role to the new user.
    // Ensure you have a 'user_roles' table and it's set up correctly.
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'judge',
      })
      .select()
      .single();

    if (roleError) {
      console.error("Role assignment error:", roleError);
      // Rollback user and profile creation if role assignment fails
      await supabaseAdmin.auth.admin.deleteUser(userId);
      // Assuming profile was created, attempt to delete it
      await supabaseAdmin.from('profiles').delete().eq('id', userId);
      return new Response(JSON.stringify({ error: roleError.message }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ message: 'Judge created successfully', judge: updatedProfile, role: roleData }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      status: 200,
    });

  } catch (error) {
    console.error("General error:", error);
    if (userId) {
        // Attempt to clean up if something unexpected happened after user creation
        await supabaseAdmin.auth.admin.deleteUser(userId);
        await supabaseAdmin.from('profiles').delete().eq('id', userId);
    }
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.' }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      status: 500,
    });
  }
});
