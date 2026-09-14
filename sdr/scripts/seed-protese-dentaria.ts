import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import type { CatalogItem } from "../src/domain/catalog.js";
import { createCatalogItemSnapshot } from "../src/domain/catalog.js";
import { SdrRepository } from "../src/infra/supabase-repository.js";
import {
  PROSTHODONTICS_TRAINING_DOCUMENTS,
  PROSTHODONTICS_TRAINING_VERSION,
} from "../src/training/prosthodontics-training.js";

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

const source = JSON.parse(await readFile(
  new URL("../data/protese-dentaria-production-snapshot.json", import.meta.url),
  "utf8",
)) as Record<string, any>;

if (
  source.id !== "75426b08-ecbc-43f3-958d-ad69860943c8"
  || source.slug !== "especializacao-em-protese-dentaria"
) {
  throw new Error("Snapshot recusado: ID ou slug de Prótese Dentária não corresponde ao autorizado.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const schemaCheck = await supabase
  .from("courses")
  .select("registration_deadline, investment_details, practical_workload")
  .limit(1);
if (schemaCheck.error) {
  throw new Error("O schema de cursos do desenvolvimento não está atualizado.");
}

const coverPath = `courses/${source.id}/cover.png`;
const cover = await readFile(new URL("../data/protese-dentaria-cover.png", import.meta.url));
const coverUpload = await supabase.storage.from("course-photos").upload(coverPath, cover, {
  contentType: "image/png",
  cacheControl: "3600",
  upsert: true,
});
if (coverUpload.error) {
  throw new Error(`Falha ao enviar a capa oficial: ${coverUpload.error.message}`);
}
const coverUrl = supabase.storage.from("course-photos").getPublicUrl(coverPath).data.publicUrl;

const teacherResult = await supabase.from("teachers").upsert({
  id: source.teacher.id,
  name: source.teacher.name,
  bio: source.teacher.bio,
  photo_url: source.teacher.photo_url,
  is_active: true,
}, { onConflict: "id" });
if (teacherResult.error) {
  throw new Error(`Falha ao cadastrar o coordenador: ${teacherResult.error.message}`);
}

const coursePayload = {
  id: source.id,
  title: source.title,
  slug: source.slug,
  area: source.area,
  nature: "especializacao",
  modality: source.modality,
  target_audience: source.target_audience,
  accepts_students: false,
  status: source.status,
  display_status: source.display_status,
  description: source.description,
  prerequisites: source.prerequisites,
  differentials: source.differentials,
  program: source.program,
  workload: source.workload,
  theoretical_workload: source.workload - source.practical_workload,
  practical_workload: source.practical_workload,
  class_count: 25,
  duration: source.duration,
  periodicity: `${source.periodicity}. ${source.schedule}`,
  vacancies: source.vacancies,
  investment: source.investment,
  investment_details: source.investment_details,
  installment_suggestion: source.installment_suggestion,
  currency: source.currency,
  registration_deadline: source.registration_deadline,
  suggested_start_date: source.suggested_start_date,
  effective_start_date: source.effective_start_date,
  end_date: source.end_date,
  teacher_id: source.teacher.id,
  course_materials: true,
  required_equipment: source.materials,
  photo_1_url: coverUrl,
  photo_2_url: null,
  photo_3_url: null,
  photo_4_url: null,
  is_archived: false,
  language: "portuguese",
  observations: [
    source.location,
    ...source.source_notes.pending_confirmation,
    "Conteúdo de atendimento consolidado a partir do projeto, FAQ, matriz de públicos e fluxo de Prótese Dentária fornecidos em 14/09/2026.",
  ].join("\n"),
};

const courseResult = await supabase
  .from("courses")
  .upsert(coursePayload, { onConflict: "id" })
  .select("id, title, slug, status, investment, investment_details, photo_1_url")
  .single();
if (courseResult.error) {
  throw new Error(`Falha ao cadastrar o curso: ${courseResult.error.message}`);
}

const course: CatalogItem = {
  ...source,
  teachers: source.teacher,
  other_professors: null,
  effective_installment: null,
  photo_1_url: coverUrl,
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
  throw new Error(`Falha ao associar o curso à configuração: ${configCourseResult.error.message}`);
}

const training = await repository.installOfficialTraining(
  wahaSession,
  PROSTHODONTICS_TRAINING_DOCUMENTS,
  PROSTHODONTICS_TRAINING_VERSION,
);

const verificationConfig = await supabase
  .from("sdr_robot_configs")
  .select("id, course_id, catalog_item_id, catalog_item_slug, script_version")
  .eq("waha_session", wahaSession)
  .single();
if (verificationConfig.error) {
  throw new Error(`Falha ao verificar a configuração persistida: ${verificationConfig.error.message}`);
}
const verificationDocuments = await supabase
  .from("sdr_knowledge_documents")
  .select("document_type, title, is_active, metadata")
  .eq("robot_config_id", verificationConfig.data.id)
  .eq("metadata->>version", PROSTHODONTICS_TRAINING_VERSION);
if (verificationDocuments.error) {
  throw new Error(`Falha ao verificar o treinamento persistido: ${verificationDocuments.error.message}`);
}
const persistedDocumentTypes = new Set(
  verificationDocuments.data.map((document) => String(document.document_type)),
);
if (
  verificationConfig.data.course_id !== source.id
  || verificationConfig.data.catalog_item_id !== source.id
  || verificationConfig.data.catalog_item_slug !== source.slug
  || verificationConfig.data.script_version !== PROSTHODONTICS_TRAINING_VERSION
  || !["commercial_script", "faq", "audience_matrix", "follow_up"]
    .every((type) => persistedDocumentTypes.has(type))
) {
  throw new Error("Verificação recusou o cadastro: vínculo ou documentos persistidos estão incompletos.");
}

console.log(JSON.stringify({
  project: "abo-traco-dev",
  importedCourse: courseResult.data,
  coordinator: source.teacher.name,
  binding: { itemId: binding.itemId, title: binding.snapshot.title },
  training: { version: training.version, readiness: training.readiness },
  verified: {
    courseId: verificationConfig.data.course_id,
    catalogSlug: verificationConfig.data.catalog_item_slug,
    scriptVersion: verificationConfig.data.script_version,
    documentTypes: [...persistedDocumentTypes].sort(),
  },
}, null, 2));
