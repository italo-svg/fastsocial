# 043 Deploy em Produção — VPS Hostinger

## Objetivo
Publicar em produção, num único VPS Hostinger, o stack inteiro do produto: painel, API, render-engine, Supabase self-hospedado (Postgres + Auth + Storage), Postiz (com seu próprio Postgres interno), n8n (com seu próprio Postgres interno), Redis e Traefik — com SSL automático, backups e hardening básico. Nada roda fora da Hostinger.

## Contexto
Última spec do projeto — depende de praticamente tudo. Ver PRD Seção 7.6 (Estratégia de Deploy) e o checklist `.prd/checklist_acessos_e_delegacao.md` (item 1.4, VPS Hostinger). Esta spec assume que o VPS já foi contratado e a chave SSH já foi configurada pelo dono do projeto — o trabalho aqui é 100% de configuração/automação, não de contratação (que é responsabilidade exclusiva do usuário, conforme o checklist).

## Stack
- **SO**: Ubuntu 22.04 LTS.
- **Orquestração**: Docker Compose (mesma stack dos specs `002`, `027`, `032`, unificada em produção).
- **Reverse proxy/SSL**: Traefik + Let's Encrypt (configuração já existe desde o spec `002`, este spec ativa o resolver real).
- **CI/CD**: GitHub Actions — build das imagens Docker + deploy via SSH no push para `main` (ou tag de release).

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] Todas as specs `001`-`042` (esta é literalmente a última etapa do projeto).

## O que implementar

### Arquivos a CRIAR
- `infra/docker-compose.prod.yml` — compose de produção unificando os serviços de `002`, `027`, `032` + os apps `web`/`api`/`render-engine` buildados como imagens (não bind mount de código-fonte como em dev).
- `infra/scripts/provision-vps.sh` — script idempotente de hardening inicial: cria usuário não-root com sudo, configura firewall (`ufw`, só 22/80/443 abertos), instala `fail2ban`, desabilita login root por senha (só chave), instala Docker + Docker Compose.
- `infra/scripts/deploy.sh` — pull das imagens mais recentes + `docker compose -f docker-compose.prod.yml up -d` + rodar migrations pendentes do Prisma.
- `infra/scripts/backup.sh` — `pg_dump` diário dos bancos internos que seguem no VPS (Postiz, n8n — o banco do produto em si já tem backup automático gerenciado pelo Supabase, não precisa ser replicado aqui) + upload dos dumps para um bucket do Supabase Storage dedicado a backups de infraestrutura (mantém tudo num único provedor de armazenamento, sem precisar operar um MinIO só para isso).
- `.github/workflows/deploy.yml` — build + push de imagens Docker (registry a definir — GitHub Container Registry é a opção mais simples de configurar sem conta adicional) + SSH deploy no push para `main`.
- `infra/README-PRODUCAO.md` — runbook completo: como fazer o primeiro deploy, como rodar rollback, como checar logs, como restaurar de um backup.

### Lógica principal
1. `provision-vps.sh` roda uma única vez no VPS novo (via SSH), deixando o servidor pronto para receber deploys.
2. Configurar os registros DNS do domínio (A record apontando para o IP do VPS) — documentar exatamente quais subdomínios criar (`app.`, `n8n.`, `postiz.`), mas a criação em si é ação do usuário no painel de DNS (conforme checklist de acessos).
3. Traefik com resolver Let's Encrypt real (removido o modo comentado do spec `002`), emitindo certificados automaticamente para cada subdomínio configurado.
4. `deploy.yml` do GitHub Actions dispara em push para `main`: builda as imagens de `apps/web`, `apps/api`, `services/render-engine`, publica no registry, conecta via SSH ao VPS e roda `deploy.sh`.
5. `backup.sh` agendado via cron do próprio sistema operacional do VPS (não dentro de um container, para sobreviver a reinícios de container), diário, com retenção mínima de 30 dias (conforme PRD Seção 7.5).
6. Variáveis de ambiente de produção nunca commitadas — vivem só no VPS (`/opt/autocontent/.env`, permissão restrita) e como GitHub Secrets para o workflow de deploy.

## Critérios de Aceitação
- [ ] CA-01: `provision-vps.sh` roda com sucesso num VPS Ubuntu 22.04 limpo, resultando em firewall ativo, Docker instalado, login root por senha desabilitado.
- [ ] CA-02: Após configurar o DNS, os 3 subdomínios (`app.`, `n8n.`, `postiz.`) respondem via HTTPS com certificado válido emitido automaticamente.
- [ ] CA-03: Push para `main` dispara o workflow de deploy e a nova versão fica no ar em produção sem intervenção manual, incluindo migrations do Prisma aplicadas.
- [ ] CA-04: `backup.sh` executado manualmente produz um dump restaurável (testar restaurando num ambiente separado).
- [ ] CA-05: Reiniciar o VPS (`reboot`) resulta em todos os serviços voltando automaticamente (`restart: always` nos containers + cron persistente).
- [ ] CA-06: `infra/README-PRODUCAO.md` é suficiente para alguém que não participou do desenvolvimento fazer um rollback de emergência seguindo só a documentação.

## Comandos de Validação
```bash
ssh deploy@<vps-ip> "docker compose -f /opt/autocontent/docker-compose.prod.yml ps"
curl -sI https://app.<dominio>
curl -sI https://n8n.<dominio>
curl -sI https://postiz.<dominio>
```

## Notas de Implementação
Este spec só deve ser executado **depois** que o VPS estiver de fato contratado e o acesso SSH entregue (item 1.4 do checklist `.prd/checklist_acessos_e_delegacao.md`) — até lá, o desenvolvimento roda inteiramente em ambiente local via `infra/docker-compose.yml` (spec `002`). Não há bloqueio para completar os specs `001`-`042` sem isso; só este último depende da infraestrutura real existir.
