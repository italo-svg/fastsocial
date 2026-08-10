#!/usr/bin/env bash
# provision-vps.sh (spec 043) — hardening idempotente de um VPS Ubuntu 22.04
# NOVO. Cria usuário não-root com sudo, firewall (só 22/80/443), fail2ban,
# desabilita login root por senha, instala Docker + Compose plugin.
#
# ATENÇÃO — NÃO RODAR NUM SERVIDOR JÁ EM PRODUÇÃO COM OUTROS SERVIÇOS:
# este script mexe em SSH (PasswordAuthentication/PermitRootLogin) e no
# firewall (ufw) do servidor inteiro, não só do FastSocial. O VPS real deste
# projeto (N8N.volupia, 69.62.92.74) já hospeda Postiz e n8n em produção
# ativa para a agência — reconfigurar SSH/firewall nele fora de uma janela de
# manutenção combinada arrisca derrubar acesso a esses serviços. Este script
# foi ESCRITO e revisado, mas conscientemente NÃO EXECUTADO contra o VPS real
# durante o spec 043 por esse motivo — ver infra/README-PRODUCAO.md.
#
# Uso: ssh root@<vps-novo> 'bash -s' < provision-vps.sh <novo_usuario>
set -euo pipefail

NEW_USER="${1:?Uso: provision-vps.sh <nome-do-usuario-deploy>}"

echo "==> Atualizando pacotes..."
apt-get update -y
apt-get upgrade -y

echo "==> Criando usuário '${NEW_USER}' com sudo (idempotente)..."
if ! id -u "$NEW_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$NEW_USER"
  usermod -aG sudo "$NEW_USER"
fi
mkdir -p "/home/${NEW_USER}/.ssh"
if [ -f /root/.ssh/authorized_keys ]; then
  cp /root/.ssh/authorized_keys "/home/${NEW_USER}/.ssh/authorized_keys"
fi
chown -R "${NEW_USER}:${NEW_USER}" "/home/${NEW_USER}/.ssh"
chmod 700 "/home/${NEW_USER}/.ssh"
chmod 600 "/home/${NEW_USER}/.ssh/authorized_keys" 2>/dev/null || true

echo "==> Instalando fail2ban..."
apt-get install -y fail2ban
systemctl enable --now fail2ban

echo "==> Configurando firewall (ufw): só 22/80/443..."
apt-get install -y ufw
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> Desabilitando login root por senha (só chave)..."
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh

echo "==> Instalando Docker + Compose plugin (idempotente)..."
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
usermod -aG docker "$NEW_USER"

echo "==> Provisionamento concluído. Logue como '${NEW_USER}' a partir de agora."
