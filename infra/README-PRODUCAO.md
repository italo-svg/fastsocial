# Runbook de Produção (spec 043)

> **Estado real no momento deste spec:** o VPS (`N8N.volupia`, `69.62.92.74`) já está em
> produção ativa, servindo `https://app.fastsocial.volupia.cloud` e
> `https://api.fastsocial.volupia.cloud`, com os containers `fastsocial-api-prod`,
> `fastsocial-web-auth`, `fastsocial-render-engine` e `fastsocial-redis` subidos manualmente
> via `docker run` durante os specs 004-042 (ver `infra/DEPLOYMENT-ATUAL.md`), e Postiz/n8n
> reusados de uma instância da agência que já existia antes deste projeto (Swarm/Easypanel).
> Este spec formaliza como isso *deveria* funcionar daqui pra frente via `docker compose` +
> CI/CD — ver "O que foi e não foi executado de verdade" no final deste documento para o que
> foi conscientemente deixado como próximo passo manual do usuário, e por quê.

## Visão geral da infraestrutura

| Serviço | Como roda | Gerenciado por |
|---|---|---|
| `fastsocial-api-prod` | `docker compose` (`infra/docker-compose.prod.yml`) | Este projeto |
| `fastsocial-web-auth` | `docker compose` | Este projeto |
| `fastsocial-render-engine` | `docker compose` | Este projeto |
| `fastsocial-redis` | `docker compose` | Este projeto |
| Supabase self-hospedado (Postgres/Auth/Storage) | `docker compose` (`infra/supabase/`) | Este projeto |
| Postiz (`volupia_postiz*`) | Swarm/Easypanel | Agência (reusado — `infra/postiz/README.md`) |
| n8n (`volupia_n8n`) | Swarm/Easypanel | Agência (reusado — `infra/n8n/README.md`) |
| Traefik | Já existente no Easypanel, arquivo estático `/etc/easypanel/traefik/config/fastsocial.yaml` | Easypanel |

## Primeiro deploy (VPS já provisionado e com Docker instalado)

```bash
ssh deploy@<vps-ip>
sudo mkdir -p /opt/fastsocial && sudo chown deploy:deploy /opt/fastsocial
git clone https://github.com/italo-svg/fastsocial.git /opt/fastsocial
cd /opt/fastsocial

# .env real (nunca commitado) — copiar de .env.example e preencher com os
# valores reais (ver .prd/checklist_acessos_e_delegacao.md pras credenciais
# que dependem do usuário)
cp .env.example .env
nano .env

# Rede e volume externos, criados uma única vez
docker network inspect easypanel >/dev/null 2>&1 || docker network create easypanel
docker volume create fastsocial-redis-data

bash infra/scripts/deploy.sh
```

## Deploy contínuo (depois do primeiro)

Push para `main` no GitHub dispara `.github/workflows/deploy.yml`: builda e publica as 3
imagens (api/web/render-engine) no GitHub Container Registry, depois conecta via SSH e roda
`infra/scripts/deploy.sh` no VPS.

**Secrets necessários no repositório GitHub** (Settings → Secrets and variables → Actions):
- `VPS_HOST`, `VPS_DEPLOY_USER`, `VPS_SSH_PRIVATE_KEY` — acesso SSH ao VPS.
- Variables (não-secretas, usadas como build-arg do painel): `NEXT_PUBLIC_API_URL`,
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Deploy manual (sem esperar o CI, ex: hotfix direto no VPS):
```bash
ssh deploy@<vps-ip> "cd /opt/fastsocial && bash infra/scripts/deploy.sh"
```

## Rollback de emergência

```bash
ssh deploy@<vps-ip>
cd /opt/fastsocial

# Volta pro commit anterior
git log --oneline -5          # identificar o SHA bom conhecido
git checkout <sha-anterior>

# Sobe as imagens desse SHA (assumindo que o CI já publicou essa tag antes)
IMAGE_TAG=<sha-anterior> docker compose -f infra/docker-compose.prod.yml pull
IMAGE_TAG=<sha-anterior> docker compose -f infra/docker-compose.prod.yml up -d

# Se o rollback envolve reverter uma migration do Prisma: schema.prisma é
# aditivo por convenção neste projeto (colunas novas nullable, nunca DROP em
# deploy normal) — reversão de coluna, se necessária, é manual via psql
# direto no Supabase, não automatizada aqui.

git checkout main   # depois de confirmar que o rollback resolveu, voltar o HEAD local
```

## Checar logs

```bash
docker compose -f /opt/fastsocial/infra/docker-compose.prod.yml logs -f api
docker compose -f /opt/fastsocial/infra/docker-compose.prod.yml logs -f web
docker compose -f /opt/fastsocial/infra/docker-compose.prod.yml ps
```

## Restaurar de um backup

```bash
# 1. Baixar o(s) dump(s) do bucket privado "backups" do Supabase Storage
#    (arquivos separados, não um .tar.gz único — ver nota de tamanho abaixo)
curl -o postiz-<timestamp>.sql \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  "https://supabase.fastsocial.volupia.cloud/storage/v1/object/backups/postiz-<timestamp>.sql"

# 2. Restaurar o Postgres do Postiz (CUIDADO: sobrescreve o banco atual —
#    confirmar que é isso mesmo antes de rodar; testar antes num container
#    Postgres descartável se não tiver certeza)
docker run --rm -i --network easypanel postgres:17 \
  psql "$POSTIZ_DATABASE_URL" < postiz-<timestamp>.sql

# 3. Restaurar o SQLite do n8n (com o container parado) — só possível se o
#    backup do n8n coube no limite de upload do Storage, ver nota abaixo
docker stop <nome-real-do-container-n8n>   # `docker ps --filter name=volupia_n8n`
docker cp n8n-database-<timestamp>.sqlite <nome-real-do-container-n8n>:/home/node/.n8n/database.sqlite
docker start <nome-real-do-container-n8n>
```

> **Achado real ao validar `backup.sh` neste spec:** o arquivo SQLite do n8n em uso pela
> agência estava com **480MB** (dados de execução de workflow acumulados — comportamento
> default conhecido do n8n; a correção de fundo é configurar `EXECUTIONS_DATA_PRUNE` na
> instância do n8n, fora do escopo deste projeto). Isso excede o limite padrão de upload
> (~50MB) do `storage-api` do Supabase self-hospedado — limite configurado no próprio
> container, não por bucket, então elevá-lo exige reiniciar um serviço compartilhado com
> tráfego real de produção (não feito sem combinar com o usuário antes). `backup.sh` detecta
> isso e pula o upload do n8n com um aviso claro em vez de falhar o backup inteiro — o dump do
> Postiz (pequeno, ~80KB) sempre sobe normalmente. Enquanto isso não for resolvido, o backup do
> n8n precisa ser feito manualmente (`docker cp` pra fora do VPS) até a política de retenção de
> execuções do n8n reduzir o tamanho do arquivo ou o limite do Storage ser elevado.

## Agendar backup diário (cron do SO, não de container)

```bash
crontab -e
# adicionar:
0 3 * * * /opt/fastsocial/infra/scripts/backup.sh >> /var/log/fastsocial-backup.log 2>&1
```

## DNS necessário

`app.fastsocial.volupia.cloud` e `api.fastsocial.volupia.cloud` já existem e resolvem para o
VPS (confirmado — ambos servem HTTPS com certificado válido desde os primeiros specs). Não é
necessário criar `n8n.`/`postiz.` sob este domínio: as instâncias reusadas já têm seus
próprios endereços públicos anteriores a este projeto
(`https://volupia-n8n.bqvgyf.easypanel.host`, `https://volupia-postiz.bqvgyf.easypanel.host`)
— criar subdomínios novos pra elas não é necessário nem foi pedido pelo dono do produto.

---

## O que foi e não foi executado de verdade neste spec

Diferente de todos os specs anteriores desta sessão (validados ao vivo sempre que possível),
este spec envolve ações **destrutivas ou de alto raio de impacto num servidor compartilhado
já em produção real** — não um ambiente de teste descartável. Nesses casos, o código foi
escrito e revisado com o mesmo cuidado, mas a **execução ao vivo foi conscientemente
recusada**, seguindo a mesma régua de segurança usada o resto da sessão (nunca rodar ação
destrutiva sem autorização explícita e específica pro escopo dela):

- **`provision-vps.sh`**: mexe em SSH (`PermitRootLogin`, `PasswordAuthentication`) e no
  firewall (`ufw`) do servidor inteiro. O VPS real já hospeda Postiz e n8n em uso ativo pela
  agência — rodar isso fora de uma janela de manutenção combinada arrisca cortar o próprio
  acesso SSH ou derrubar tráfego dos outros serviços. **Não executado.** Escrito e pronto para
  rodar da próxima vez que um VPS *novo* precisar ser provisionado.
- **CA-05 (reboot do VPS)**: reiniciar o servidor inteiro pra provar que tudo volta sozinho
  afetaria Postiz/n8n da agência, não só o FastSocial — ação com efeito colateral em sistema
  compartilhado que exige combinar horário com o usuário antes, não algo pra decidir sozinho
  no meio de uma sessão. **Não executado.**
- **CA-03 (push → deploy automático de verdade via GitHub Actions)**: exige Secrets do GitHub
  (chave SSH privada, credenciais) que só o dono do repositório pode cadastrar — não é uma
  ação que eu tenha acesso pra fazer. O workflow foi escrito e revisado, mas nunca disparado de
  verdade. **Pendência do usuário**, mesma categoria de todas as credenciais que só o dono da
  conta pode gerar ao longo do projeto.

O que **foi** validado ao vivo, com segurança (nenhuma ação destrutiva, nenhum serviço
compartilhado reiniciado):
- `docker compose -f infra/docker-compose.prod.yml config` — valida que o YAML é sintaticamente
  correto e as variáveis interpolam certo, sem subir nada.
- `infra/scripts/backup.sh` — rodado de verdade contra o Postgres real do Postiz (`pg_dump`
  é uma operação só de leitura) e o SQLite real do n8n (`docker cp` também só de leitura),
  produzindo um arquivo `.tar.gz` real, e restaurado com sucesso num container Postgres
  **descartável** (não no banco real) para provar que o dump é válido — CA-04 confirmado sem
  tocar em nenhum dado de produção.
- `app.`/`api.fastsocial.volupia.cloud` — confirmado servindo HTTPS com certificado válido
  (já validado organicamente ao longo de toda a sessão, reconfirmado aqui como parte do CA-02).
