import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
  },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Tratar preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  const jsonHeaders = {
    ...corsHeaders,
    "Content-Type": "application/json",
  };

  try {
    const body = await req.json();
    const { action, supervisor_id, vendedor_id, assignment_id } = body;

    if (!action) {
      return new Response(
        JSON.stringify({ error: "Ação não informada" }),
        { status: 400, headers: jsonHeaders },
      );
    }

    if (action === "assign") {
      if (!supervisor_id || !vendedor_id) {
        return new Response(
          JSON.stringify({ error: "supervisor_id e vendedor_id são obrigatórios" }),
          { status: 400, headers: jsonHeaders },
        );
      }

      const { error } = await supabase
        .from("vendedor_supervisor")
        .insert({ supervisor_id, vendedor_id });

      if (error) {
        console.error("Erro ao criar atribuição:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: jsonHeaders },
        );
      }

      return new Response(
        JSON.stringify({ success: true, action: "assign" }),
        { status: 200, headers: jsonHeaders },
      );
    }

    if (action === "unassign") {
      if (!assignment_id) {
        return new Response(
          JSON.stringify({ error: "assignment_id é obrigatório" }),
          { status: 400, headers: jsonHeaders },
        );
      }

      const { error } = await supabase
        .from("vendedor_supervisor")
        .delete()
        .eq("id", assignment_id);

      if (error) {
        console.error("Erro ao remover atribuição:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: jsonHeaders },
        );
      }

      return new Response(
        JSON.stringify({ success: true, action: "unassign" }),
        { status: 200, headers: jsonHeaders },
      );
    }

    if (action === "list") {
      const { data, error } = await supabase
        .from("vendedor_supervisor")
        .select(`
          id,
          vendedor_id,
          supervisor_id,
          vendedor:usuarios!vendedor_supervisor_vendedor_id_fkey(id, nome, email),
          supervisor:usuarios!vendedor_supervisor_supervisor_id_fkey(id, nome, email)
        `);

      if (error) {
        console.error("Erro ao listar atribuições:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: jsonHeaders },
        );
      }

      return new Response(
        JSON.stringify({ success: true, data }),
        { status: 200, headers: jsonHeaders },
      );
    }

    return new Response(
      JSON.stringify({ error: "Ação inválida" }),
      { status: 400, headers: jsonHeaders },
    );
  } catch (err) {
    console.error("Erro inesperado:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno no servidor" }),
      { status: 500, headers: jsonHeaders },
    );
  }
});
