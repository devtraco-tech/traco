import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import type { CatalogItem } from "../src/domain/catalog.js";
import { createCatalogItemSnapshot } from "../src/domain/catalog.js";
import { SdrRepository } from "../src/infra/supabase-repository.js";
import {
  OFFICIAL_TRAINING_DOCUMENTS,
  TRAINING_VERSION,
} from "../src/training/official-training.js";

dotenv.config({ path: ".env.local", quiet: true });

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

const source = JSON.parse(
  await readFile(
    new URL("../data/implantodontia-production-snapshot.json", import.meta.url),
    "utf8",
  ),
) as Record<string, any>;

if (
  source.id !== "e5b8d4f2-9c1a-4283-b7e6-81a2953f1011" ||
  source.slug !== "especializacao-em-implantodontia-e-cirurgia-avancada"
) {
  throw new Error("Snapshot recusado: ID ou slug do curso piloto não corresponde ao autorizado.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const schemaCheck = await supabase
  .from("courses")
  .select("registration_deadline, investment_details")
  .limit(1);
if (schemaCheck.error) {
  throw new Error(
    "Migration 20260807120000_add_course_pilot_commercial_fields.sql ainda não foi aplicada no desenvolvimento.",
  );
}

const teacherResult = await supabase.from("teachers").upsert({
  id: source.teacher.id,
  name: source.teacher.name,
  bio: source.teacher.bio,
  photo_url: source.teacher.photo_url,
  is_active: true,
}, { onConflict: "id" });
if (teacherResult.error) {
  throw new Error(`Falha ao importar professor público: ${teacherResult.error.message}`);
}

// O schema legado exige um número. Este total é apenas a multiplicação técnica
// das parcelas e não é anunciado pelo SDR; a fonte comercial oficial permanece textual.
const technicalInvestment = 24 * 1_850;
const coursePayload = {
  id: source.id,
  title: source.title,
  slug: source.slug,
  area: source.area,
  nature: "especializacao",
  modality: "presencial",
  target_audience: source.target_audience,
  status: source.status,
  display_status: source.display_status,
  description: source.description,
  prerequisites: source.prerequisites,
  differentials: source.differentials,
  program: source.program,
  workload: source.workload,
  duration: source.duration,
  periodicity: source.periodicity,
  vacancies: source.vacancies,
  investment: technicalInvestment,
  investment_details: source.investment,
  installment_suggestion: source.installment_suggestion,
  currency: "real",
  registration_deadline: source.registration_deadline,
  suggested_start_date: [source.suggested_start_date],
  effective_start_date: source.effective_start_date,
  end_date: source.end_date,
  teacher_id: source.teacher.id,
  photo_1_url: "https://placehold.co/1200x800?text=Especializacao+Implantodontia",
  is_archived: false,
  language: "portuguese",
  observations:
    "Snapshot sanitizado fornecido para o piloto SDR. Não contém matrículas, leads ou dados pessoais.",
};

const courseResult = await supabase
  .from("courses")
  .upsert(coursePayload, { onConflict: "id" })
  .select("id, title, slug, status, registration_deadline")
  .single();
if (courseResult.error) {
  throw new Error(`Falha ao importar curso piloto: ${courseResult.error.message}`);
}

const course: CatalogItem = {
  ...source,
  modality: "presencial",
  teachers: source.teacher,
  other_professors: null,
  investment: technicalInvestment,
  investment_details: source.investment,
  currency: "real",
  effective_installment: null,
  suggested_start_date: source.suggested_start_date,
  photo_1_url: coursePayload.photo_1_url,
  photo_2_url: null,
  photo_3_url: null,
  photo_4_url: null,
};

const repository = new SdrRepository(supabaseUrl, serviceRoleKey);
const binding = await repository.bindCatalogItem(
  wahaSession,
  createCatalogItemSnapshot(course),
  { id: "abo-goias", name: "ABO Goiás" },
);
const configCourseResult = await supabase
  .from("sdr_robot_configs")
  .update({ course_id: source.id })
  .eq("waha_session", wahaSession);
if (configCourseResult.error) {
  throw new Error(
    `Falha ao associar o curso local à configuração: ${configCourseResult.error.message}`,
  );
}
const training = await repository.installOfficialTraining(
  wahaSession,
  OFFICIAL_TRAINING_DOCUMENTS,
  TRAINING_VERSION,
);

console.log(JSON.stringify({
  project: "abo-traco-dev",
  importedCourse: courseResult.data,
  binding: { itemId: binding.itemId, title: binding.snapshot.title },
  training: { version: training.version, readiness: training.readiness },
}, null, 2));
