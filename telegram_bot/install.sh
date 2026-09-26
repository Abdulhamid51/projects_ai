#!/usr/bin/env bash
# Userbotni serverga o'rnatish va systemd servis sifatida ishga tushirish.
# Ishlatish: bash install.sh   (Ubuntu/Debian)
set -e
cd "$(dirname "$0")"
DIR="$(pwd)"
SERVICE=tg-userbot

echo "==> Kerakli paketlar"
if ! python3 -m venv --help >/dev/null 2>&1 || ! command -v pip3 >/dev/null; then
  sudo apt-get update -y && sudo apt-get install -y python3 python3-venv python3-pip
fi

echo "==> Virtual muhit va kutubxonalar"
[ -d venv ] || python3 -m venv venv
./venv/bin/pip install -q --upgrade pip
./venv/bin/pip install -q -r requirements.txt

if [ ! -f .env ]; then
  echo "==> .env sozlamalari"
  read -rp "API_ID (my.telegram.org): " API_ID
  read -rp "API_HASH: " API_HASH
  read -rp "O'zingiz haqingizda qisqa ma'lumot: " OWNER_INFO
  sed -e "s|^API_ID=.*|API_ID=$API_ID|" \
      -e "s|^API_HASH=.*|API_HASH=$API_HASH|" \
      -e "s|^OWNER_INFO=.*|OWNER_INFO=$OWNER_INFO|" \
      .env.example > .env
  chmod 600 .env
fi

# GEMINI_API_KEY boshqa loyihalar bilan umumiy ../.env da turadi
if ! grep -qs '^GEMINI_API_KEY=.' ../.env .env; then
  echo "==> ../.env da GEMINI_API_KEY topilmadi"
  read -rp "GEMINI_API_KEY: " GEMINI_API_KEY
  printf 'GEMINI_API_KEY=%s\nGEMINI_MODEL=gemini-2.5-flash\n' "$GEMINI_API_KEY" >> ../.env
  chmod 600 ../.env
fi

if [ ! -f userbot_session.session ]; then
  echo "==> Telegram login (telefon raqam va kod so'raladi)"
  ./venv/bin/python main.py --login
  chmod 600 userbot_session.session
fi

echo "==> systemd servis"
sudo tee /etc/systemd/system/$SERVICE.service >/dev/null <<UNIT
[Unit]
Description=Telegram auto-reply userbot
After=network-online.target
Wants=network-online.target

[Service]
User=$(whoami)
WorkingDirectory=$DIR
ExecStart=$DIR/venv/bin/python -u main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
UNIT
sudo systemctl daemon-reload
sudo systemctl enable --now $SERVICE

echo
echo "Tayyor! Bot ishlayapti."
echo "  Holat:      sudo systemctl status $SERVICE"
echo "  Loglar:     sudo journalctl -u $SERVICE -f"
echo "  Qayta yoq.: sudo systemctl restart $SERVICE"
echo "  To'xtatish: sudo systemctl stop $SERVICE"
