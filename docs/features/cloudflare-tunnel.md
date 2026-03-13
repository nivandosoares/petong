# Cloudflare Tunnel Workflow

This repository includes a Cloudflare Tunnel helper so you can expose a local development server and inspect the project remotely.

The helper script is [scripts/start-cloudflare-tunnel.sh](/home/nivando/petrepo/scripts/start-cloudflare-tunnel.sh).
The local preview server is [scripts/start-preview.sh](/home/nivando/petrepo/scripts/start-preview.sh).

## Installation gate

`cloudflared` is not installed automatically by the agent.

If the binary is missing, the script exits and tells the operator to request installation approval first. This matches the repository rule that stack and tooling changes require explicit human approval.

## Quick preview tunnel

For local live previews without a configured Cloudflare zone, use a quick tunnel:

```bash
bash scripts/start-preview.sh 3000
```

In a second shell:

```bash
bash scripts/start-cloudflare-tunnel.sh quick http://localhost:3000
```

This uses Cloudflare's documented quick-tunnel flow and will print a random public `trycloudflare.com` URL when `cloudflared` is installed.

## Named tunnel config

For a stable hostname on a domain managed by Cloudflare, generate the config file first:

```bash
CF_TUNNEL_ID=your-tunnel-id \
CF_TUNNEL_HOSTNAME=preview.example.com \
CF_TUNNEL_CREDENTIALS_FILE=$HOME/.cloudflared/your-tunnel-id.json \
bash scripts/start-cloudflare-tunnel.sh print-config http://localhost:3000
```

Then run the named tunnel:

```bash
CF_TUNNEL_ID=your-tunnel-id \
CF_TUNNEL_HOSTNAME=preview.example.com \
CF_TUNNEL_CREDENTIALS_FILE=$HOME/.cloudflared/your-tunnel-id.json \
bash scripts/start-cloudflare-tunnel.sh named http://localhost:3000
```

The generated config follows Cloudflare's documented local-management format with:

- `tunnel`
- `credentials-file`
- an ingress rule for your hostname and local service
- a final `http_status:404` catch-all rule

## References

- Cloudflare Tunnel setup: https://developers.cloudflare.com/tunnel/setup/
- Cloudflare Tunnel configuration file: https://developers.cloudflare.com/tunnel/advanced/local-management/configuration-file/
