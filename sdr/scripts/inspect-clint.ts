import { config as loadDotenv } from "dotenv";

loadDotenv({ path: [".env.local", ".env"], quiet: true });

const token = process.env.CLINT_API_TOKEN?.trim();
if (!token) throw new Error("Preencha CLINT_API_TOKEN em .env.local.");

const headers = { accept: "application/json", "api-token": token };

async function list(path: string, key: string): Promise<Array<Record<string, unknown>>> {
  const response = await fetch(`https://api.clint.digital/v1${path}`, { headers });
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(`Clint ${path} retornou HTTP ${response.status}.`);
  if (Array.isArray(body)) return body as Array<Record<string, unknown>>;
  for (const value of [body[key], body.data, body.items]) {
    if (Array.isArray(value)) return value as Array<Record<string, unknown>>;
  }
  if (body.data && typeof body.data === "object" && !Array.isArray(body.data)) {
    const data = body.data as Record<string, unknown>;
    for (const value of [data[key], data.items]) {
      if (Array.isArray(value)) return value as Array<Record<string, unknown>>;
    }
    if (key === "fields" && data.fields && typeof data.fields === "object" && !Array.isArray(data.fields)) {
      return Object.entries(data.fields as Record<string, unknown>).flatMap(([entity, values]) => {
        if (!values || typeof values !== "object" || Array.isArray(values)) return [];
        return Object.entries(values as Record<string, unknown>).flatMap(([id, field]) =>
          id === "groups" || !field || typeof field !== "object" || Array.isArray(field)
            ? []
            : [{ id, entity, ...(field as Record<string, unknown>) }]
        );
      });
    }
  }
  return [];
}

const [origins, users, fields] = await Promise.all([
  list("/origins?limit=1000", "origins"),
  list("/users?limit=1000", "users"),
  list("/account/fields", "fields"),
]);

const compact = (items: Array<Record<string, unknown>>) => items.map((item) => ({
  id: item.id,
  name: item.name
    ?? item.label
    ?? [item.first_name, item.last_name].filter(Boolean).join(" ")
    ?? item.email,
  stages: Array.isArray(item.stages)
    ? item.stages.map((stage: Record<string, unknown>) => ({
        id: stage.id,
        name: stage.name ?? stage.label,
      }))
    : undefined,
  type: item.type,
}));

console.info(JSON.stringify({
  origins: compact(origins),
  users: compact(users),
  fields: compact(fields),
}, null, 2));
