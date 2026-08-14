import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const developmentUrl = "https://yoqocelwzhhpzvlsbncq.supabase.co";
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (supabaseUrl !== developmentUrl) {
  throw new Error(
    `Operação cancelada: SUPABASE_URL não aponta para o projeto de desenvolvimento (${developmentUrl}).`,
  );
}

if (!serviceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada em .env.local.");
}

const courses = [
  {
    id: "00000000-0000-4000-8000-000000000101",
    title: "[TESTE SDR] Imersão em Harmonização Orofacial",
    slug: "teste-sdr-imersao-harmonizacao-orofacial",
    area: "Harmonização Orofacial",
    modality: "presencial",
    target_audience: "cirurgioes_dentistas",
    vacancies: 20,
    workload: 16,
    investment: 1800,
    prerequisites: "Graduação em Odontologia e inscrição ativa no CRO.",
    effective_start_date: "2026-09-15",
    end_date: "2026-09-16",
    description:
      "Curso fictício para testes do robô SDR. Aborda avaliação facial, planejamento e técnicas introdutórias de harmonização orofacial.",
    differentials:
      "Aulas práticas em laboratório e acompanhamento de professores.",
    program: "Anatomia facial; planejamento; segurança; técnicas de aplicação.",
    periodicity: "Dois dias consecutivos",
    duration: "2 dias",
    photo_1_url: "https://placehold.co/1200x800?text=Curso+Teste+SDR",
    status: "approved",
    is_archived: false,
    language: "portuguese",
    currency: "real",
  },
  {
    id: "00000000-0000-4000-8000-000000000102",
    title: "[TESTE SDR] Aperfeiçoamento em Endodontia",
    slug: "teste-sdr-aperfeicoamento-endodontia",
    area: "Endodontia",
    modality: "hibrido",
    target_audience: "cirurgioes_dentistas",
    vacancies: 25,
    workload: 80,
    investment: 3200,
    prerequisites:
      "Cirurgião-dentista ou acadêmico do último ano, sujeito à análise.",
    effective_start_date: "2026-10-10",
    end_date: "2027-02-20",
    description:
      "Curso fictício para testes do robô SDR sobre diagnóstico, instrumentação mecanizada e obturação endodôntica.",
    differentials:
      "Conteúdo online e encontros presenciais com atividades práticas.",
    program: "Diagnóstico; acesso; instrumentação; irrigação; obturação.",
    periodicity: "Um encontro mensal",
    duration: "5 meses",
    photo_1_url: "https://placehold.co/1200x800?text=Curso+Teste+SDR",
    status: "approved",
    is_archived: false,
    language: "portuguese",
    currency: "real",
  },
  {
    id: "00000000-0000-4000-8000-000000000103",
    title: "[TESTE SDR] Aperfeiçoamento em Implantodontia",
    slug: "teste-sdr-aperfeicoamento-implantodontia",
    area: "Implantodontia",
    modality: "presencial",
    target_audience: "cirurgioes_dentistas",
    vacancies: 15,
    workload: 140,
    investment: 17000,
    prerequisites: "Graduação completa em Odontologia e registro profissional ativo.",
    effective_start_date: "2026-09-18",
    end_date: "2027-07-18",
    description:
      "Curso fictício para testes do robô SDR com protocolos simplificados, guia cirúrgica, fluxo digital e prática supervisionada.",
    differentials:
      "Planejamento digital, prática clínica supervisionada e discussão de casos.",
    program: "Diagnóstico; cirurgia; prótese; planejamento digital; manutenção.",
    periodicity: "Uma sexta-feira e um sábado por mês",
    duration: "10 meses",
    photo_1_url: "https://placehold.co/1200x800?text=Curso+Teste+SDR",
    status: "in_progress",
    is_archived: false,
    language: "portuguese",
    currency: "real",
  },
];

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data, error } = await supabase
  .from("courses")
  .upsert(courses, { onConflict: "id" })
  .select("id, title, status, area, modality, effective_start_date, investment");

if (error) {
  throw new Error(`Falha ao inserir cursos de teste: ${error.message}`);
}

console.log(
  JSON.stringify(
    {
      project: "abo-traco-dev",
      projectRef: "yoqocelwzhhpzvlsbncq",
      insertedOrUpdated: data.length,
      courses: data,
    },
    null,
    2,
  ),
);
