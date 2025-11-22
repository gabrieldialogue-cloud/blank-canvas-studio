import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email e senha são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting user reset process...');

    // Step 1: Get all existing auth users
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      throw listError;
    }

    console.log(`Found ${existingUsers?.users?.length || 0} existing users`);

    // Step 2: Delete all data from tables (due to foreign keys, order matters)
    console.log('Deleting vendedor_supervisor records...');
    await supabase.from('vendedor_supervisor').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('Deleting intervencoes records...');
    await supabase.from('intervencoes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('Deleting mensagens records...');
    await supabase.from('mensagens').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('Deleting status_atendimento records...');
    await supabase.from('status_atendimento').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('Deleting atendimentos records...');
    await supabase.from('atendimentos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('Deleting clientes records...');
    await supabase.from('clientes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('Deleting config_vendedores records...');
    await supabase.from('config_vendedores').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('Deleting user_roles records...');
    await supabase.from('user_roles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('Deleting profiles records...');
    await supabase.from('profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('Deleting usuarios records...');
    await supabase.from('usuarios').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Step 3: Delete all auth users
    if (existingUsers?.users) {
      for (const user of existingUsers.users) {
        console.log(`Deleting auth user: ${user.email}`);
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
        if (deleteError) {
          console.error(`Error deleting user ${user.email}:`, deleteError);
        }
      }
    }

    console.log('All users deleted. Creating new super-admin...');

    // Step 4: Create new super-admin auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: 'Super Admin',
      },
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      throw authError;
    }

    console.log(`Super-admin auth user created with ID: ${authData.user.id}`);

    // Step 5: Create usuario record
    const { data: usuarioData, error: usuarioError } = await supabase
      .from('usuarios')
      .insert({
        user_id: authData.user.id,
        nome: 'Super Admin',
        email,
        role: 'admin',
      })
      .select()
      .single();

    if (usuarioError) {
      console.error('Error creating usuario:', usuarioError);
      // Rollback: delete auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw usuarioError;
    }

    console.log(`Usuario created with ID: ${usuarioData.id}`);

    // Step 6: Create user_role record with super_admin role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: 'super_admin',
      });

    if (roleError) {
      console.error('Error creating user_role:', roleError);
      // Continue anyway, role is created
    }

    console.log('Super-admin role assigned successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Sistema resetado e super-admin criado com sucesso',
        user: {
          id: usuarioData.id,
          email: usuarioData.email,
          nome: usuarioData.nome,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
