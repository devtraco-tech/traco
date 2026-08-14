import dotenv from "dotenv";
import { SdrRepository } from "../src/infra/supabase-repository.js";
import {
  OFFICIAL_TRAINING_DOCUMENTS,
  TRAINING_VERSION,
} from "../src/training/official-training.js";

dotenv.config({ path: ".env.local" });

const developmentUrl = "https://yoqocelwzhhpzvlsbncq.supabase.co";
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const wahaSession = process.env.WAHA_SESSION ?? "default";

if (supabaseUrl !== developmentUrl) {
  throw new Error("Operação cancelada: este seed só pode rodar no abo-traco-dev.");
}
if (!serviceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada em .env.local.");
}

const repository = new SdrRepository(supabaseUrl, serviceRoleKey);
const training = await repository.installOfficialTraining(
  wahaSession,
  OFFICIAL_TRAINING_DOCUMENTS,
  TRAINING_VERSION,
);

console.log(JSON.stringify({ project: "abo-traco-dev", training }, null, 2));
