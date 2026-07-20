import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify requesting user is admin or service role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");

    // Check if it's the service role key (internal calls) or via custom header
    const internalKey = req.headers.get("x-internal-key");
    const isServiceRole = token === supabaseServiceKey || internalKey === supabaseServiceKey;

    if (!isServiceRole) {
      const {
        data: { user: requestingUser },
        error: authError,
      } = await supabaseAdmin.auth.getUser(token);

      if (authError || !requestingUser) {
        return new Response(JSON.stringify({ error: "Sessão inválida" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: roleData, error: roleError } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", requestingUser.id)
        .eq("role", "admin")
        .maybeSingle();

      if (roleError || !roleData) {
        return new Response(JSON.stringify({ error: "Acesso negado. Apenas administradores podem criar usuários." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { email, password, name, role, department_id } = await req.json();

    if (!email || !password || !name) {
      return new Response(JSON.stringify({ error: "Email, senha e nome são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: "A senha deve ter no mínimo 6 caracteres" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user via admin API (auto-confirms email)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      return new Response(JSON.stringify({ error: `Erro ao criar usuário: ${createError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Assign role if provided
    if (role && newUser.user) {
      const validRoles = ["admin", "staff", "student", "triage_coordenador", "triage_atendente", "triage_dentista"];
      if (validRoles.includes(role)) {
        const { error: roleInsertError } = await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: newUser.user.id, role });

        if (roleInsertError) {
          console.error("Error assigning role:", roleInsertError);
        }
      }
    }

    // Assign department if provided
    if (department_id && newUser.user) {
      const { error: deptError } = await supabaseAdmin
        .from("profiles")
        .update({ department_id })
        .eq("id", newUser.user.id);

      if (deptError) {
        console.error("Error assigning department:", deptError);
      }
    }

    return new Response(JSON.stringify({ success: true, user: { id: newUser.user?.id, email: newUser.user?.email } }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
