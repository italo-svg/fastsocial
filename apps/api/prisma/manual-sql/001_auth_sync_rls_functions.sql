-- ============================================================
-- Sincronizacao auth.users (GoTrue) -> public.users
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, auth_provider, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_app_meta_data->>'provider', 'email'),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Funcoes de negocio
-- ============================================================
CREATE OR REPLACE FUNCTION public.mark_insight_consumed()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.insight_id IS NOT NULL THEN
    UPDATE research_insights SET consumed = true WHERE id = NEW.insight_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_insight_consumed ON content_pieces;
CREATE TRIGGER trg_mark_insight_consumed
  AFTER INSERT ON content_pieces
  FOR EACH ROW EXECUTE FUNCTION public.mark_insight_consumed();

CREATE OR REPLACE FUNCTION public.enforce_monthly_post_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_limit INTEGER;
  v_count INTEGER;
BEGIN
  SELECT max_posts_per_month INTO v_limit
  FROM subscriptions WHERE workspace_id = NEW.workspace_id;

  SELECT COUNT(*) INTO v_count
  FROM content_pieces
  WHERE workspace_id = NEW.workspace_id
    AND status IN ('scheduled', 'published')
    AND created_at >= date_trunc('month', NOW());

  IF v_limit IS NOT NULL AND v_count >= v_limit THEN
    RAISE EXCEPTION 'Limite mensal de posts do plano atingido (%). Faça upgrade para continuar.', v_limit;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_post_limit ON content_pieces;
CREATE TRIGGER trg_enforce_post_limit
  BEFORE INSERT ON content_pieces
  FOR EACH ROW EXECUTE FUNCTION public.enforce_monthly_post_limit();

-- ============================================================
-- RLS: habilitar em todas as tabelas com dado de tenant
-- e criar policy padrao usando auth.uid() (defesa em profundidade;
-- a aplicacao via WorkspaceGuard e a linha de frente real - ver spec 007)
-- ============================================================
DO $$
DECLARE
  t TEXT;
  tenant_tables TEXT[] := ARRAY[
    'brand_kits', 'research_insights', 'content_pieces',
    'social_accounts', 'autopilot_pipelines', 'workspace_addons',
    'automation_flows'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY "workspace_members_access" ON %I FOR ALL USING (
         workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
       )', t
    );
  END LOOP;
END $$;

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_view_own_workspace" ON workspaces
  FOR SELECT USING (
    id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_see_own_memberships" ON workspace_members
  FOR SELECT USING (user_id = auth.uid());

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_view_own_row" ON users
  FOR SELECT USING (auth.uid() = id);

-- Tabelas filhas (isolamento via join com a tabela pai)
ALTER TABLE content_slides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_members_access_slides" ON content_slides
  FOR ALL USING (
    content_piece_id IN (
      SELECT cp.id FROM content_pieces cp
      JOIN workspace_members wm ON wm.workspace_id = cp.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

ALTER TABLE publications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_members_read_publications" ON publications
  FOR SELECT USING (
    content_piece_id IN (
      SELECT cp.id FROM content_pieces cp
      JOIN workspace_members wm ON wm.workspace_id = cp.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

ALTER TABLE template_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "everyone_reads_system_templates" ON template_assets
  FOR SELECT USING (is_system_template = true);
CREATE POLICY "workspace_manages_own_templates" ON template_assets
  FOR ALL USING (
    is_system_template = false AND
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );
