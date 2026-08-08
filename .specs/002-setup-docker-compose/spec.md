# 002 Setup Docker Compose (Supabase Self-hosted + Redis + Traefik, no VPS)

## Objetivo
Provisionar, diretamente no VPS Hostinger já existente (`N8N.volupia`, `69.62.92.74`), a infraestrutura de base do produto: o stack open source do Supabase (Postgres + Auth + Storage) self-hospedado, Redis e Traefik — sem nenhuma instalação local.

## Contexto
Segue o spec `001-setup-monorepo`. **Não existe ambiente de desenvolvimento local neste projeto** — leia `.specs/shared/como-executar.md` antes de começar, é o contrato operacional deste spec. Tudo é feito via SSH direto no VPS já existente (`N8N.volupia`, `69.62.92.74`, agora KVM 4), que **já roda Postiz, n8n e Cal.com em produção via Easypanel** — este spec não deve tocar nesses serviços.

**Topologia já mapeada (reconhecimento feito antes de escrever este spec, não repetir):**
- O servidor roda em **Docker Swarm**, gerenciado pelo Easypanel. Redes overlay relevantes: `easypanel` (**attachable=true**, confirmado) e `easypanel-volupia`.
- O Traefik do Easypanel (`easypanel-traefik`) usa o **provider de arquivo** do Traefik (`TRAEFIK_PROVIDERS_FILE_DIRECTORY=/data/config`, montado em `/etc/easypanel/traefik/config/` no host, com `FILE_WATCH=true`), além do provider Docker. O arquivo `main.yaml` nesse diretório é **gerado e sobrescrito pelo próprio Easypanel** — nunca editar esse arquivo diretamente (mesma lição do `~/.claude.json`: arquivo de app, não de config manual).
- Traefik carrega **todos** os arquivos `.yaml`/`.yml` daquele diretório (modo diretório do file provider) e faz merge — então um arquivo **novo e separado** nesse mesmo diretório (`autocontent-os.yaml`) é seguro, aditivo, e sobrevive a qualquer regeneração do `main.yaml` pelo Easypanel.
- O resolver de certificado já configurado se chama `letsencrypt` (`TRAEFIK_CERTIFICATESRESOLVERS_letsencrypt_...`) — reusar esse mesmo resolver nas novas rotas, não criar um segundo.

O banco/auth/storage do produto usam o **stack open source self-hospedado do Supabase** (não o serviço gerenciado supabase.com — decisão explícita do dono do produto de manter tudo na Hostinger, ver `.prd/prd_autocontent_os.md` Seção 7.2).

## Stack
- **Docker Compose** v2 (já deve existir no VPS, dado que Postiz/n8n já rodam nele — confirmar antes de instalar de novo).
- **Supabase self-hosted**: stack oficial (`github.com/supabase/supabase`, pasta `docker/`) — Postgres, GoTrue (Auth), PostgREST, Storage API, Kong (gateway), Studio (painel admin do Supabase), Realtime.
- **Redis** 7.
- **Traefik**: **reusar o Traefik do Easypanel já existente** (`easypanel-traefik`) — nunca subir uma segunda instância (portas 80/443 já estão ocupadas por ela). Integração via arquivo de configuração dinâmica separado (ver Contexto).
- **Variáveis de ambiente necessárias**: ver `.specs/shared/como-executar.md`, bloco Supabase self-hospedado + `REDIS_URL`.

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `001-setup-monorepo`
- [ ] Acesso SSH ao VPS confirmado (chave pública adicionada pelo usuário/colaborador ao `authorized_keys` do servidor).

## O que implementar

### Arquivos a CRIAR
- `infra/supabase/docker-compose.yml` — o stack oficial do Supabase self-hosted (copiado/adaptado do repositório oficial), com volumes nomeados persistentes para o Postgres.
- `infra/supabase/.env.example` — variáveis próprias do stack Supabase (JWT secret, anon key, service role key, senha do Postgres — geradas uma única vez e documentadas em `.specs/shared/como-executar.md`).
- `infra/supabase/generate-keys.sh` — script que gera `JWT_SECRET` (aleatório seguro) e deriva `ANON_KEY`/`SERVICE_ROLE_KEY` a partir dele (seguindo a documentação oficial de self-hosting do Supabase), para rodar uma única vez na configuração inicial.
- `infra/docker-compose.yml` — serviço `redis`, na rede externa `easypanel` (`networks: { easypanel: { external: true } }`) para ser alcançável pelo Traefik existente e pelos futuros containers da API.
- `infra/traefik/autocontent-os.yaml` — arquivo de configuração dinâmica do Traefik **próprio deste projeto**, com routers/services para `supabase.<dominio>` (Studio e Kong), usando `certResolver: letsencrypt` (o resolver já existente). Este arquivo é copiado para `/etc/easypanel/traefik/config/autocontent-os.yaml` no VPS — **nunca** editar `main.yaml` (gerado pelo Easypanel).
- `infra/scripts/deploy-traefik-config.sh` — script que copia `infra/traefik/autocontent-os.yaml` para o diretório correto no host via SSH e confirma (via `docker logs easypanel-traefik`) que o Traefik recarregou sem erro de parsing.
- `infra/scripts/inventory-vps.sh` — script de diagnóstico, mantido para reexecução caso o servidor mude entre specs (ex: novos apps adicionados via Easypanel por fora deste projeto).

### Lógica principal
1. Rodar `inventory-vps.sh` novamente antes de qualquer alteração, para confirmar que o estado do servidor não mudou desde o reconhecimento inicial (documentado no Contexto desta spec).
2. Subir o stack do Supabase self-hosted (spec desta pasta) **conectado à rede overlay `easypanel` já existente** (`external: true` no compose) — isso torna os containers do Supabase alcançáveis pelo Traefik do Easypanel por nome de serviço (Docker DNS interno da rede overlay), sem precisar expor portas para o host.
3. Escrever `infra/traefik/autocontent-os.yaml` com um router HTTPS para `supabase.<dominio>` apontando (`loadBalancer.servers[].url`) para o serviço Kong do Supabase pelo nome do container/serviço na rede `easypanel` (ex: `http://supabase-kong:8000`), e copiá-lo para `/etc/easypanel/traefik/config/` via `deploy-traefik-config.sh`.
4. Gerar as chaves do Supabase (`generate-keys.sh`) uma única vez, salvar no `.env` do servidor (`/opt/autocontent/.env`), nunca commitado.
5. Redis sobe como container simples na mesma rede `easypanel`, sem senha inicialmente.
6. Validar que o Supabase Studio está acessível via HTTPS no subdomínio escolhido (certificado emitido automaticamente pelo resolver `letsencrypt` já configurado), e que o Postgres aceita conexão do futuro container da API (spec `004`) pela rede interna.

## Critérios de Aceitação
- [ ] CA-01: `inventory-vps.sh` roda e documenta claramente o que já existe no servidor antes de qualquer mudança.
- [ ] CA-02: O stack Supabase self-hosted sobe com sucesso no VPS, sem derrubar ou reiniciar os containers existentes do Postiz/n8n (validar que eles continuam `Up`/`running` depois).
- [ ] CA-03: `https://supabase.<dominio>` (Studio) responde com certificado SSL válido.
- [ ] CA-04: Uma conexão de teste ao Postgres via `psql $DATABASE_URL -c "select 1"`, feita de dentro do VPS, funciona.
- [ ] CA-05: `redis-cli -u $REDIS_URL ping` retorna `PONG`, executado de dentro do VPS.
- [ ] CA-06: Nenhuma rota HTTP/HTTPS pré-existente (do Postiz, do n8n, ou de qualquer outra coisa no servidor) foi quebrada pela adição do roteamento do Supabase.

## Comandos de Validação
```bash
ssh -i ~/.ssh/autocontent_hostinger_ed25519 root@69.62.92.74 "bash /opt/autocontent/infra/scripts/inventory-vps.sh"
ssh -i ~/.ssh/autocontent_hostinger_ed25519 root@69.62.92.74 "docker compose -f /opt/autocontent/infra/supabase/docker-compose.yml ps"
curl -sI https://supabase.<dominio>
```

## Notas de Implementação
Este é o spec de maior risco operacional da Fase 0 — mexe num servidor com produção real de outros usos do dono do produto. Priorizar sempre a opção mais conservadora (não sobrescrever configuração existente, não reiniciar serviços existentes sem necessidade, perguntar antes de qualquer ação ambígua) sobre a mais rápida.
