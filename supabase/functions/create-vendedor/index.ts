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

    const { nome, email, senha, especialidade_marca } = await req.json();

    // Validate input
    if (!nome || !email || !senha || !especialidade_marca) {
      return new Response(
        JSON.stringify({ error: 'Todos os campos são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (senha.length < 6) {
      return new Response(
        JSON.stringify({ error: 'A senha deve ter no mínimo 6 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Creating vendedor: ${email}`);

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: {
        full_name: nome,
      },
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return new Response(
        JSON.stringify({ error: `Erro ao criar usuário: ${authError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Auth user created with ID: ${authData.user.id}`);

    // Create usuario record
    const { data: usuarioData, error: usuarioError } = await supabase
      .from('usuarios')
      .insert({
        user_id: authData.user.id,
        nome,
        email,
        role: 'vendedor',
      })
      .select()
      .single();

    if (usuarioError) {
      console.error('Error creating usuario:', usuarioError);
      // Rollback: delete auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: `Erro ao criar vendedor: ${usuarioError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Usuario created with ID: ${usuarioData.id}`);

    // Create config_vendedores record
    const { error: configError } = await supabase
      .from('config_vendedores')
      .insert({
        usuario_id: usuarioData.id,
        especialidade_marca,
        prioridade: '3',
        status_online: false,
      });

    if (configError) {
      console.error('Error creating config_vendedores:', configError);
      // Continue anyway, this is not critical
    }

    // Create user_role record
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: 'vendedor',
      });

    if (roleError) {
      console.error('Error creating user_role:', roleError);
      // Continue anyway
    }

    console.log('Vendedor created successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        vendedor: {
          id: usuarioData.id,
          nome: usuarioData.nome,
          email: usuarioData.email,
          especialidade_marca,
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
