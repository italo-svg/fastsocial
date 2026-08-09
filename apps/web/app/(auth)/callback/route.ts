import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Troca o `code` do OAuth (retorno do Google) por sessao — padrao @supabase/ssr para App Router.
export async function GET(request: Request): Promise<Response> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
