import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Troca o `code` do OAuth (retorno do Google) por sessao — padrao @supabase/ssr para App Router.
export async function GET(request: Request): Promise<Response> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Links de confirmação de e-mail do Supabase carregam type=signup; login
  // via Google (mesmo endpoint de troca de code) não carrega esse param —
  // usado abaixo só pra saber se dispara o evento email_confirmed (spec 046).
  const isEmailConfirmation = searchParams.get("type") === "signup";

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const redirectUrl = new URL("/dashboard", origin);
  if (isEmailConfirmation) redirectUrl.searchParams.set("funnel_event", "email_confirmed");
  return NextResponse.redirect(redirectUrl);
}
