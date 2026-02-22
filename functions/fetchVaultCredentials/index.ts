import { createClientFromRequest } from "npm:@base44/sdk";

const VAULT_ADDR = Deno.env.get("VAULT_ADDR") || "";
const VAULT_TOKEN = Deno.env.get("VAULT_TOKEN") || "";
const VAULT_NAMESPACE = Deno.env.get("VAULT_NAMESPACE") || "";
const VAULT_SECRET_PATH_PREFIX = Deno.env.get("VAULT_SECRET_PATH_PREFIX") || "secret/data/connections";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { connection_name } = await req.json();
    if (!connection_name) {
      return Response.json({ error: "connection_name is required" }, { status: 400 });
    }

    if (!VAULT_ADDR || !VAULT_TOKEN) {
      return Response.json({ error: "Vault is not configured. Set VAULT_ADDR and VAULT_TOKEN secrets." }, { status: 500 });
    }

    // Build Vault KV v2 URL: <prefix>/<connection_name>
    // e.g. secret/data/connections/my-db-conn
    const secretPath = `${VAULT_SECRET_PATH_PREFIX}/${connection_name}`;
    const url = `${VAULT_ADDR}/v1/${secretPath}`;

    const headers: Record<string, string> = {
      "X-Vault-Token": VAULT_TOKEN,
      "Content-Type": "application/json",
    };

    if (VAULT_NAMESPACE) {
      headers["X-Vault-Namespace"] = VAULT_NAMESPACE;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const body = await response.text();
      return Response.json(
        { error: `Vault returned ${response.status}`, detail: body },
        { status: response.status }
      );
    }

    const vaultData = await response.json();

    // KV v2 stores data under .data.data
    const secretData = vaultData?.data?.data || vaultData?.data || {};

    // Return only the fields relevant to connection testing
    return Response.json({
      host:              secretData.host              || null,
      port:              secretData.port              || null,
      database:          secretData.database          || null,
      username:          secretData.username          || null,
      password:          secretData.password          || null,
      connection_string: secretData.connection_string || null,
      access_key:        secretData.access_key        || null,
      secret_key:        secretData.secret_key        || null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});