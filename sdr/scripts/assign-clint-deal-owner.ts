import { config as loadDotenv } from "dotenv";

loadDotenv({ path: [".env.local", ".env"], quiet: true });

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const [dealId, userId, confirmation] = process.argv.slice(2);
const token = process.env.CLINT_API_TOKEN?.trim();

if (!token) throw new Error("CLINT_API_TOKEN não configurado.");
if (!dealId || !uuidPattern.test(dealId)) throw new Error("Informe um negócio Clint válido.");
if (!userId || !uuidPattern.test(userId)) throw new Error("Informe um usuário Clint válido.");
if (confirmation !== "--confirm") throw new Error("Inclua --confirm para atribuir o responsável.");

const headers = {
  accept: "application/json",
  "api-token": token,
  "content-type": "application/json",
};

const before = await getDeal(dealId);
const response = await fetch(`https://api.clint.digital/v1/deals/${dealId}`, {
  method: "POST",
  headers,
  body: JSON.stringify({ user_id: userId }),
  signal: AbortSignal.timeout(10_000),
});
if (!response.ok) throw new Error(`Clint retornou HTTP ${response.status}.`);

const after = await getDeal(dealId);
if (after.userId !== userId) throw new Error("A Clint não confirmou a atribuição do responsável.");

console.info(JSON.stringify({
  dealId,
  previousUserId: before.userId,
  assignedUserId: after.userId,
  stageId: after.stageId,
  status: after.status,
}, null, 2));

async function getDeal(id: string): Promise<{
  userId: string | null;
  stageId: string | null;
  status: string | null;
}> {
  const response = await fetch(`https://api.clint.digital/v1/deals/${id}`, {
    headers,
    signal: AbortSignal.timeout(10_000),
  });
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(`Clint retornou HTTP ${response.status}.`);
  const deal = body.data && typeof body.data === "object" && !Array.isArray(body.data)
    ? body.data as Record<string, unknown>
    : body;
  const user = deal.user && typeof deal.user === "object" && !Array.isArray(deal.user)
    ? deal.user as Record<string, unknown>
    : null;
  return {
    userId: typeof user?.id === "string" ? user.id : null,
    stageId: typeof deal.stage_id === "string" ? deal.stage_id : null,
    status: typeof deal.status === "string" ? deal.status : null,
  };
}
