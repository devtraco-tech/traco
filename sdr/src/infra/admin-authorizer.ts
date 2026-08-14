import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type AdminAuthorization =
  | { authorized: true; userId: string }
  | { authorized: false; statusCode: 401 | 403; message: string };

export interface AdminAuthorizerLike {
  authorize(authorizationHeader?: string): Promise<AdminAuthorization>;
}

export class AdminAuthorizer implements AdminAuthorizerLike {
  private readonly client: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    this.client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async authorize(authorizationHeader?: string): Promise<AdminAuthorization> {
    const token = parseBearerToken(authorizationHeader);
    if (!token) {
      return {
        authorized: false,
        statusCode: 401,
        message: "Token de acesso ausente ou inválido",
      };
    }

    const userResult = await this.client.auth.getUser(token);
    if (userResult.error || !userResult.data.user) {
      return {
        authorized: false,
        statusCode: 401,
        message: "Sessão expirada ou inválida",
      };
    }

    const roleResult = await this.client
      .from("user_roles")
      .select("role")
      .eq("user_id", userResult.data.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleResult.error) {
      throw new Error(`Falha ao validar permissão administrativa: ${roleResult.error.message}`);
    }

    if (!roleResult.data) {
      return {
        authorized: false,
        statusCode: 403,
        message: "Acesso permitido somente para administradores",
      };
    }

    return { authorized: true, userId: userResult.data.user.id };
  }
}

function parseBearerToken(header?: string): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/iu.exec(header.trim());
  return match?.[1]?.trim() || null;
}
