#!/bin/sh
set -e
# Write the backend URL into config.js so one image works locally and on Render.
cat > /usr/share/nginx/html/config.js <<CONF
window.__SECORA_CONFIG__ = { API_BASE: "${API_BASE_URL:-}" };
CONF
