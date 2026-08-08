# 031 Conexões Frontend

## Objetivo
Implementar a tela onde o usuário conecta/gerencia suas contas Instagram, Facebook e LinkedIn.

## Contexto
Segue os specs `028` (Meta bridge) e `029` (LinkedIn bridge). Ver PRD Seção 5.2, linha "Conexões & Integrações".

## Stack
- **Framework**: Next.js.
- **Fluxo OAuth no browser**: popup window (`window.open`) para a URL retornada pelos endpoints de conexão, com `postMessage` ou polling do backend (`GET /social-accounts`) para detectar quando a conexão foi concluída após o popup fechar.

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `028-meta-oauth-bridge`
- [ ] `029-linkedin-oauth-bridge`

## O que implementar

### Arquivos a CRIAR
- `apps/web/app/(workspace)/connections/page.tsx` — lista de contas conectadas + botões "Conectar Instagram/Facebook" e "Conectar LinkedIn".
- `apps/web/components/connections/AccountCard.tsx` — card por conta com status colorido (`connected`/`expired`/`revoked`/`error`), nome da conta, rede, botão "Reconectar" quando `expired`.
- `apps/web/components/connections/ConnectButton.tsx` — abre o popup OAuth, faz polling em `GET /social-accounts` a cada 2s por até 60s após o popup fechar, chama `POST /social-accounts/sync` (Meta) quando aplicável.
- `apps/web/hooks/useSocialAccounts.ts`.

### Lógica principal
1. Botão "Conectar Instagram/Facebook": chama `POST /social-accounts/connect/meta`, abre a URL retornada em popup; ao popup fechar (detectar via `setInterval` checando `popup.closed`), dispara `POST /social-accounts/sync` e depois refetch de `GET /social-accounts`.
2. Botão "Conectar LinkedIn": abre `GET /social-accounts/connect/linkedin` em popup; o callback já persiste a conta no backend (spec `029`), então só é necessário refetch de `GET /social-accounts` após o popup fechar (sem endpoint de sync adicional, ao contrário do fluxo Meta).
3. Conta com `status='expired'` mostra badge vermelho persistente + botão "Reconectar" que repete o mesmo fluxo de conexão para aquela rede específica.
4. Desconectar (`DELETE /social-accounts/:id`) pede confirmação (modal) antes de executar, avisando que peças agendadas para aquela conta serão canceladas.

## Critérios de Aceitação
- [ ] CA-01: Conectar uma conta Instagram/Facebook de teste via popup resulta na conta aparecendo na lista com status "Conectado" sem precisar recarregar a página manualmente.
- [ ] CA-02: Conectar uma LinkedIn Company Page de teste segue o mesmo padrão de sucesso.
- [ ] CA-03: Conta com token expirado mostra claramente o badge de erro e o botão de reconexão funciona (repete o fluxo com sucesso).
- [ ] CA-04: Desconectar uma conta exige confirmação e, após confirmada, remove da lista.
- [ ] CA-05: Fechar o popup do OAuth sem completar o fluxo (usuário cancelou) não deixa a UI presa em estado de "carregando" indefinidamente — timeout após 60s com mensagem clara.

## Comandos de Validação
```bash
pnpm --filter web dev
# manual: conectar/desconectar contas de teste, validar os CAs acima
```

## Notas de Implementação
Popups de OAuth podem ser bloqueados por bloqueadores de popup do navegador se não forem abertos diretamente na ação de clique do usuário (sem `await` antes do `window.open`) — abrir o popup síncrono e só então buscar a URL real via chamada assíncrona, atualizando o `location` do popup já aberto, para evitar bloqueio.
