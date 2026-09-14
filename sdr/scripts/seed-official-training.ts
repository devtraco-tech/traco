import dotenv from "dotenv";
import { SdrRepository } from "../src/infra/supabase-repository.js";
import { getCourseTraining } from "../src/training/course-training.js";

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
const binding = await repository.getCatalogBinding(wahaSession);
const selectedTraining = getCourseTraining(binding?.slug);
const training = await repository.installOfficialTraining(
  wahaSession,
  selectedTraining.documents,
  selectedTraining.version,
);

console.log(JSON.stringify({
  project: "abo-traco-dev",
  courseSlug: binding?.slug ?? null,
  training,
}, null, 2));
