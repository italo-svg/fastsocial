# Checklist de Acessos e Delegação — AutoContent OS

> Objetivo deste documento: separar com clareza **o que só você pode fazer** (por exigir identidade jurídica, verificação de negócio ou pagamento) de **o que eu faço a partir do momento em que tiver acesso**, e o que eu já posso começar a construir **hoje, sem depender de nada disso**.

---

## Por que existe essa divisão (e não "eu faço tudo")

Por política de segurança do meu ambiente, algumas ações são estruturalmente **proibidas para mim, mesmo com sua autorização explícita**: criar contas em serviços de terceiros, inserir senhas, inserir dados financeiros (cartão, dados bancários) ou executar a etapa de pagamento em nome de outra pessoa/empresa. Isso não é uma questão de confiança — é porque essas etapas exigem **identidade jurídica real** (CNPJ/CPF, verificação de negócio, aceite de termos de uso vinculante) que só você, como responsável legal do produto, pode assumir. Meta, LinkedIn e Stripe, em especial, fazem verificação de identidade/negócio como parte do processo — um agente de IA não passa (nem deveria passar) por essa verificação.

A boa notícia: **tudo o que é código, configuração e infraestrutura técnica, eu faço** — inclusive depois que você me der acesso (chave SSH, API key, token), sem precisar que você digite comando nenhum.

---

## Parte 1 — O que só você pode fazer (contas e identidade)

### 1.0 Supabase (Auth + Database + Storage)
- [ ] Criar conta/projeto em [supabase.com](https://supabase.com) (plano Free serve para o MVP; upgrade para Pro quando o volume justificar).
- [ ] Anotar, no painel do projeto (Settings → API): `Project URL`, `anon public key`, `service_role key` (segredo — nunca expor no frontend), e em Settings → Database: a connection string do Postgres (para o Prisma).
- [ ] Em Settings → API → JWT Settings: anotar o `JWT Secret` (usado pela API para validar as sessões emitidas pelo Supabase Auth).
- [ ] Ativar o provider Google no Auth (Authentication → Providers), se quiser login social desde já — opcional, pode ficar só e-mail/senha no início.
- **Por que este item mudou de prioridade**: ao contrário de Meta/LinkedIn/Stripe, este não tem verificação de identidade nem prazo de aprovação — é o item mais rápido do checklist e desbloqueia praticamente todo o desenvolvimento (specs `003`, `006`, `007`, `008`, `009` dependem dele). Faça este primeiro.
- **O que você me passa**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `DATABASE_URL` (connection string do Postgres).

### 1.1 Meta for Developers (Instagram + Facebook)
- [ ] Criar/usar uma conta no [Meta Business Suite](https://business.facebook.com) vinculada ao CNPJ da empresa.
- [ ] Criar um App em [developers.facebook.com](https://developers.facebook.com), tipo "Business".
- [ ] Passar pela **Verificação de Negócio da Meta** (envio de documentos — pode levar alguns dias).
- [ ] Solicitar as permissões: `instagram_basic`, `instagram_content_publish`, `pages_manage_posts`, `pages_read_engagement`, `pages_show_list`.
- [ ] Submeter para **App Review** — a Meta normalmente pede um vídeo de demonstração do fluxo real de uso. **Eu preparo o roteiro e você grava a tela** (ou gravo eu mesmo via automação de navegador, se preferir, uma vez que o app já estiver rodando).
- **Prazo típico:** alguns dias a poucas semanas, com possíveis idas e vindas de revisão. **Comece isso o quanto antes** — é o item de maior risco de cronograma.
- **O que você me passa depois:** `META_APP_ID`, `META_APP_SECRET`, e a Página do Facebook/conta Instagram Business de teste conectada.

### 1.2 LinkedIn Developer Portal
- [ ] Criar um App em [linkedin.com/developers](https://www.linkedin.com/developers/apps), vinculado a uma **LinkedIn Company Page verificada**.
- [ ] Solicitar acesso ao produto certo — isso precisa de uma decisão sua/nossa logo no início:
  - **"Community Management API"** — geralmente mais acessível para ferramentas que publicam em nome de Company Pages (nosso caso de uso), mas ainda exige aprovação e justificativa de uso.
  - **"Marketing Developer Platform"** — voltado a parceiros de anúncios/automação em maior escala; historicamente **muito mais difícil de aprovar** para uma ferramenta nova/pequena.
- ⚠️ **Risco a validar cedo:** a aprovação de acesso de publicação da LinkedIn para apps de terceiros é notoriamente mais restritiva que a da Meta. Recomendo submeter a solicitação **nas primeiras semanas do projeto**, em paralelo ao desenvolvimento, para não travar o lançamento esperando aprovação. Se for negado, o plano B é publicação assistida (o sistema prepara o post, um humano publica manualmente pela LinkedIn) até conseguirmos acesso via parceria.
- **O que você me passa depois:** `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, Company Page de teste.

### 1.3 Stripe (billing)
- [ ] Criar conta em [stripe.com](https://stripe.com) com CNPJ da empresa.
- [ ] Completar verificação de identidade/conta bancária para receber pagamentos.
- [ ] Ativar modo live (sair do modo teste) quando estiver pronto para cobrar de verdade.
- **O que você me passa:** `STRIPE_SECRET_KEY` (modo teste primeiro), `STRIPE_WEBHOOK_SECRET`. Eu crio os Produtos/Preços/Webhooks via API a partir daí — não precisa clicar nada manualmente no painel da Stripe além da criação da conta.

### 1.4 Hostinger (VPS) — ✅ acesso via API configurado em 2026-08-08
- [x] Token da API da Hostinger gerado e configurado globalmente em `~/.claude.json` (7 conectores: hosting, domains, dns, billing, reach, vps, ecommerce) — permite que eu crie/gerencie VPS, DNS e domínios diretamente, sem depender de acesso SSH manual repassado por você.
- [ ] Ainda assim, se em algum momento eu precisar de acesso SSH direto ao servidor (para debug fino, por exemplo), o formato recomendado continua sendo chave pública, nunca senha.
- **Nota de segurança:** o token dá acesso amplo à conta Hostinger (inclusive billing/ecommerce, habilitados a seu pedido). Eu nunca crio, modifico ou apago recursos que gerem cobrança ou afetem DNS/domínios em produção sem confirmar com você antes, ação por ação — o token me dá capacidade, não autorização permanente para agir sozinho.
- **Pendente:** os servidores MCP só carregam no início de uma sessão do Claude Code — preciso que você inicie uma nova sessão para eu conseguir efetivamente chamar essas ferramentas.

### 1.5 Domínio
- [ ] Registrar o domínio da marca (onde quer que já esteja: Hostinger, Registro.br, etc.).
- **O que você me passa:** acesso ao painel de DNS (ou você mesmo cria os registros que eu indicar — A/CNAME apontando para o IP do VPS). Não preciso de acesso à conta do registrador em si, só da permissão para criar/editar registros DNS.

### 1.6 Lovable (opcional, cosmético — não é infraestrutura)
- [ ] Nada obrigatório aqui. Dado o requisito de tudo rodar só na Hostinger, o Lovable **não hospeda nada em produção** — o painel roda como container no VPS, igual todo o resto. Se você ainda quiser o Lovable só como editor visual (sincronizado com o mesmo repositório GitHub, por conveniência pessoal de edição), pode conectar por conta própria a qualquer momento; não bloqueia nem afeta o restante do projeto. Se preferir, ignore esse item por completo.

### 1.7 Provedores de IA
- [ ] Conta na **Anthropic (Claude API)** com billing ativo — para copy, "diretor de cena" e QA de imagem por visão.
- [ ] Conta em **fal.ai** ou **Replicate** — para geração de imagem (Flux.1), com billing ativo.
- [ ] (Opcional) Conta na **Unsplash API** ou **Pexels API** — para a fonte "Banco de Imagens".
- **O que você me passa:** as respectivas API keys.

### 1.8 GitHub
- [ ] Criar (ou apontar) um repositório privado para o projeto, se ainda não existir um remoto para esta pasta local.
- **O que você me passa:** acesso de escrita ao repositório (ou eu crio a estrutura local e você faz o primeiro push).

---

## Parte 2 — O que eu faço assim que tiver cada acesso

| Acesso recebido | O que eu executo |
|---|---|
| Chave SSH do VPS | Hardening inicial (desabilita senha, firewall, fail2ban), instala Docker/Docker Compose, sobe a stack completa (painel, API, Postiz, n8n, Postgres, Redis, MinIO, Traefik) |
| DNS do domínio | Configuro os registros necessários e o Traefik para emitir certificado SSL automático (Let's Encrypt) para cada subdomínio (`app.`, `n8n.`, `postiz.`) |
| `META_APP_ID`/`SECRET` | Implemento e testo o fluxo OAuth completo de Instagram/Facebook, incluindo troca e renovação de token |
| `LINKEDIN_CLIENT_ID`/`SECRET` | Implemento o fluxo OAuth do LinkedIn e a publicação de post/documento (carrossel) |
| `STRIPE_SECRET_KEY` | Crio os Produtos/Preços via API conforme os planos que definirmos, configuro Checkout, Customer Portal e webhooks de assinatura |
| `ANTHROPIC_API_KEY` | Configuro os três usos de Claude (copy, diretor de cena, QA de visão) na API do produto |
| `fal.ai`/Replicate key | Configuro o serviço de geração de imagem com a arquitetura de prompt da Seção 7.7 do PRD |
| Repositório GitHub | Faço todos os commits do código (frontend, backend, infra, migrations, workflows n8n) diretamente aqui |

---

## Parte 3 — Decisão de arquitetura: onde fica o frontend

**Atualizado:** nada de terceiro hospeda o app — nem Supabase Cloud, nem Lovable, nem Vercel. O painel (Next.js/TypeScript) é código real neste repositório e roda como container Docker no seu VPS Hostinger, atrás do Traefik, junto com todo o resto do stack. Motivo de ser código versionado (e não gerado via prompt dentro de alguma ferramenta): o painel tem lógica de negócio densa (multi-tenant, fila de aprovação, editor com preview em tempo real, calendário com drag-and-drop) que fica mais confiável e revisável assim. O Lovable, se você quiser, entra só como editor visual opcional sincronizado via GitHub — nunca como o lugar onde o app efetivamente roda para os usuários.

---

## Parte 4 — O que eu já começo agora, sem esperar nada disso

Nenhum dos itens abaixo depende de conta externa — são código e configuração puros. Vou começar a estruturar o monorepo (Next.js + NestJS + Prisma + Docker Compose + workflows n8n como JSON versionado) descrito na Seção 7.3 do PRD assim que confirmarmos o plano, com dados fake/mocks no lugar de Meta/LinkedIn/Stripe reais até as credenciais chegarem. Isso garante que, no dia em que as contas estiverem prontas, é só trocar variável de ambiente — não recomeçar nada.

---

## Ordem sugerida (para não travar o cronograma)

1. **Agora, primeiro de tudo:** Supabase (5 minutos, sem verificação) — desbloqueia a Fase 0/1 inteira do desenvolvimento.
2. **Agora, em paralelo com o item acima:** você inicia Meta Business Verification + submete o app LinkedIn (são os itens de maior prazo).
3. **Esta semana:** VPS + domínio + GitHub (rápidos de resolver, desbloqueiam deploy contínuo desde já).
4. **Assim que possível:** contas Anthropic/fal.ai (desbloqueiam testar a geração de conteúdo de ponta a ponta mesmo antes da publicação real funcionar).
5. **Por último, antes de cobrar de verdade:** Stripe em modo live (modo teste pode ser configurado desde já).
