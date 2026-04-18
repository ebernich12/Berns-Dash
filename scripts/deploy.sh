#!/bin/bash
# Run this on the Oracle server to deploy the latest build.
set -e

echo "==> Pulling latest..."
git pull origin master

echo "==> Installing deps..."
npm ci

echo "==> Building..."
npm run build

echo "==> Restarting PM2..."
pm2 restart berns-dashboard

echo "==> Done. $(date)"
