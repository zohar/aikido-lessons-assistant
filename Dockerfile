FROM nginx:1.27-alpine
# Full URL of the n8n production webhook (set it in Coolify > Environment Variables).
ENV N8N_WEBHOOK_URL=https://n8n.ovadia.rocks/webhook/carnet-seances
COPY deploy/default.conf.template /etc/nginx/templates/default.conf.template
COPY web/ /usr/share/nginx/html/
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/healthz || exit 1
