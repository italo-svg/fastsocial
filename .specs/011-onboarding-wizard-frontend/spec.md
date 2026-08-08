# 011 Onboarding Wizard Frontend

## Objetivo
Implementar o wizard guiado de 4 passos onde o Admin do Workspace configura o brand kit pela primeira vez.

## Contexto
Segue os specs `008` (auth frontend), `009` (workspace provisioning) e `010` (brand kit API). Após criar um workspace novo, o usuário é redirecionado para este wizard (ver PRD Seção 3, jornada "Admin do Workspace — Primeiro Uso", passos 2-5, e Seção 5.2 tabela de páginas, linha "Onboarding").

## Stack
- **Framework**: Next.js App Router, React Hook Form + Zod, TanStack Query (mutations para os endpoints do spec `010`).
- **Upload de arquivo**: `react-dropzone` ou input nativo com preview local antes do upload.
- **Variáveis de ambiente necessárias**: `NEXT_PUBLIC_API_URL` (já configurada).

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `008-auth-frontend`
- [ ] `009-workspace-provisioning`
- [ ] `010-crud-brand-kit-api`

## O que implementar

### Arquivos a CRIAR
- `apps/web/app/(workspace)/onboarding/brand/page.tsx` — container do wizard, controla o passo atual (state local, não precisa persistir entre sessões no MVP).
- `apps/web/app/(workspace)/onboarding/brand/_steps/Step1Niche.tsx` — nicho + até 5 concorrentes (inputs dinâmicos, adicionar/remover linha).
- `apps/web/app/(workspace)/onboarding/brand/_steps/Step2Voice.tsx` — textarea de tom de voz + opção de colar exemplos de texto.
- `apps/web/app/(workspace)/onboarding/brand/_steps/Step3Visual.tsx` — upload de logo, color picker (extração automática de paleta a partir do logo via lib client-side tipo `colorthief`, com opção de ajuste manual), seletor de tipografia (dropdown com 5-6 fontes do Google Fonts pré-aprovadas).
- `apps/web/app/(workspace)/onboarding/brand/_steps/Step4ImageSource.tsx` — seletor de fonte de imagem padrão (3 cards: Biblioteca Própria / Banco de Imagens / Geração com IA); se "Geração com IA" for escolhido, exibe o upload de 3-8 imagens de referência com explicação curta de por que isso importa (fidelidade de marca — referenciar a lógica do PRD 7.7 numa linguagem simples para o usuário leigo).
- `apps/web/components/onboarding/ProgressDots.tsx`, `WizardNav.tsx` (botões Voltar/Próximo/Concluir).
- `apps/web/hooks/useBrandKit.ts` — hook TanStack Query (`useQuery`/`useMutation`) sobre os endpoints do spec `010`.

### Lógica principal
1. Cada passo salva seu pedaço de estado localmente (React state/Context do wizard); só no clique de "Concluir" do último passo é que dispara `PUT /brand-kit` com o payload completo (evita múltiplas chamadas parciais).
2. Uploads de logo/imagens de referência (Passos 3 e 4) são enviados imediatamente ao serem selecionados (não esperam o "Concluir"), para dar feedback visual rápido — usam os endpoints dedicados `POST /brand-kit/logo` e `POST /brand-kit/reference-images`.
3. Ao concluir o Passo 4, redireciona para `/onboarding/templates` (spec `014`) — este spec cria a rota mas o conteúdo real da tela de seleção de templates iniciais é do spec `014`; aqui basta um `router.push`.
4. Validação por passo: não deixa avançar sem nicho preenchido (Passo 1) nem sem ao menos a paleta de cores extraída/definida (Passo 3). Passo 4 não bloqueia avanço mesmo com poucas imagens de referência (mostra o warning vindo da API, spec `010` CA-06).

## Critérios de Aceitação
- [ ] CA-01: Completar os 4 passos com dados mínimos válidos resulta em `GET /brand-kit` retornando os dados salvos corretamente.
- [ ] CA-02: Upload de logo no Passo 3 mostra preview imediato e a paleta extraída automaticamente (editável).
- [ ] CA-03: Escolher "Geração com IA" no Passo 4 revela a área de upload de imagens de referência; escolher as outras duas opções, não.
- [ ] CA-04: Tentar avançar do Passo 1 sem preencher nicho mostra erro de validação inline, sem deixar avançar.
- [ ] CA-05: Botão "Voltar" preserva os dados já preenchidos nos passos anteriores (não reseta o formulário).
- [ ] CA-06: Ao concluir, o usuário é redirecionado para `/onboarding/templates`.

## Comandos de Validação
```bash
pnpm --filter web dev
# manual: percorrer o wizard completo, validar cada CA acima no navegador
```

## Notas de Implementação
A extração automática de paleta a partir do logo é um "nice to have" de UX — se a lib client-side escolhida (`colorthief` ou similar) apresentar problemas de CORS com imagens servidas pelo Supabase Storage, cair para: usuário define a paleta manualmente via color picker, sem bloquear a spec por causa disso.
