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

    const { action, user_id, nome, email, especialidade_marca } = await req.json();

    if (action === 'enable') {
      // Habilitar vendedor - adicionar na tabela usuarios
      console.log(`Enabling vendedor: ${email}`);

      // Check if already exists
      const { data: existing } = await supabase
        .from('usuarios')
        .select('id')
        .eq('user_id', user_id)
        .single();

      if (existing) {
        return new Response(
          JSON.stringify({ error: 'Vendedor já está habilitado' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create usuario record
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .insert({
          user_id,
          nome,
          email,
          role: 'vendedor',
        })
        .select()
        .single();

      if (usuarioError) {
        console.error('Error creating usuario:', usuarioError);
        return new Response(
          JSON.stringify({ error: `Erro ao habilitar vendedor: ${usuarioError.message}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create config_vendedores record
      const { error: configError } = await supabase
        .from('config_vendedores')
        .insert({
          usuario_id: usuarioData.id,
          especialidade_marca: especialidade_marca || 'Geral',
          prioridade: '3',
          status_online: false,
        });

      if (configError) {
        console.error('Error creating config:', configError);
      }

      // Create user_role record
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id,
          role: 'vendedor',
        });

      if (roleError) {
        console.error('Error creating role:', roleError);
      }

      console.log('Vendedor enabled successfully');

      return new Response(
        JSON.stringify({ success: true, message: 'Vendedor habilitado com sucesso' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (action === 'disable') {
      // Desabilitar vendedor - remover da tabela usuarios
      console.log(`Disabling vendedor: ${email}`);

      // Get usuario_id
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('id')
        .eq('user_id', user_id)
        .single();

      if (!usuario) {
        return new Response(
          JSON.stringify({ error: 'Vendedor não está habilitado' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delete config_vendedores
      await supabase
        .from('config_vendedores')
        .delete()
        .eq('usuario_id', usuario.id);

      // Delete user_role
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', user_id)
        .eq('role', 'vendedor');

      // Delete usuario
      const { error: deleteError } = await supabase
        .from('usuarios')
        .delete()
        .eq('user_id', user_id);

      if (deleteError) {
        console.error('Error deleting usuario:', deleteError);
        return new Response(
          JSON.stringify({ error: `Erro ao desabilitar vendedor: ${deleteError.message}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Vendedor disabled successfully');

      return new Response(
        JSON.stringify({ success: true, message: 'Vendedor desabilitado com sucesso' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (action === 'list') {
      // Listar todos os usuários auth
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

      if (authError) {
        throw authError;
      }

      // Get usuarios habilitados
      const { data: usuarios } = await supabase
        .from('usuarios')
        .select('user_id, id, nome, email, role');

      const usuariosMap = new Map(usuarios?.map(u => [u.user_id, u]) || []);

      const vendedores = authUsers.users.map(user => ({
        user_id: user.id,
        email: user.email,
        nome: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Sem nome',
        created_at: user.created_at,
        habilitado: usuariosMap.has(user.id),
        usuario_id: usuariosMap.get(user.id)?.id,
      }));

      return new Response(
        JSON.stringify({ vendedores }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Ação inválida' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
