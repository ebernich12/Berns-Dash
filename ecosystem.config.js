module.exports = {
  apps: [
    {
      name: 'berns-dashboard',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '512M',
      restart_delay: 3000,
      log_file: '/var/log/berns-dashboard/combined.log',
      error_file: '/var/log/berns-dashboard/error.log',
      merge_logs: true,
    },
    {
      name: 'berns-webhook',
      script: 'scripts/webhook-server.mjs',
      interpreter: 'node',
      watch: false,
      log_file: '/var/log/berns-dashboard/webhook.log',
      error_file: '/var/log/berns-dashboard/webhook-error.log',
      merge_logs: true,
    },
  ],
}
