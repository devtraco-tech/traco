-- Migration: Migrate patient_leads to patients (Fila 1) in UPPERCASE without duplicating CPFs
INSERT INTO public.patients (
    full_name,
    birth_date,
    cpf,
    mobile_phone,
    state,
    city,
    treatment_needed,
    current_stage,
    reception_status,
    no_show_count,
    created_at
)
SELECT 
    UPPER(TRIM(pl.full_name)),
    pl.birth_date,
    pl.cpf,
    pl.mobile_phone,
    UPPER(TRIM(pl.state)),
    UPPER(TRIM(pl.city)),
    UPPER(TRIM(pl.treatment_needed)),
    'step1_atendimento',
    'entrada',
    0,
    COALESCE(pl.created_at, NOW())
FROM public.patient_leads pl
WHERE pl.cpf IS NOT NULL 
  AND pl.cpf <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.patients p WHERE p.cpf = pl.cpf
  );
