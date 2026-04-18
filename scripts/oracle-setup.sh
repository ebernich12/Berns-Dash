#!/bin/bash
# One-time setup for Oracle A1 instance (Ubuntu ARM).
# Run as: bash scripts/oracle-setup.sh
set -e

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2
sudo npm install -g pm2

# nginx + certbot
sudo apt-get install -y nginx certbot python3-certbot-nginx

# Log directory
sudo mkdir -p /var/log/berns-dashboard
sudo chown $USER:$USER /var/log/berns-dashboard

# Clone & build (replace with your repo URL)
# git clone https://github.com/YOUR_USERNAME/berns-dashboard.git ~/dashboard
# cd ~/dashboard
# cp .env.local.example .env.local   # then fill in keys
# npm ci && npm run build

# Start with PM2
# pm2 start ecosystem.config.js
# pm2 save
# pm2 startup   # follow the printed command to enable on reboot

# nginx config — add to /etc/nginx/sites-available/berns-dashboard:
#
# server {
#   listen 80;
#   server_name YOUR_DOMAIN_OR_IP;
#   location / {
#     proxy_pass http://localhost:3000;
#     proxy_http_version 1.1;
#     proxy_set_header Upgrade $http_upgrade;
#     proxy_set_header Connection 'upgrade';
#     proxy_set_header Host $host;
#     proxy_cache_bypass $http_upgrade;
#   }
# }
#
# sudo ln -s /etc/nginx/sites-available/berns-dashboard /etc/nginx/sites-enabled/
# sudo nginx -t && sudo systemctl reload nginx
# sudo certbot --nginx -d YOUR_DOMAIN   # for HTTPS

# Cron — runs intelligence collection daily at 6am
# (crontab -l; echo "0 6 * * * curl -s -H 'Authorization: Bearer YOUR_CRON_SECRET' http://localhost:3000/api/intelligence/collect >> /var/log/berns-dashboard/collect.log 2>&1") | crontab -

echo "Oracle setup reference complete. Follow the commented steps above."
