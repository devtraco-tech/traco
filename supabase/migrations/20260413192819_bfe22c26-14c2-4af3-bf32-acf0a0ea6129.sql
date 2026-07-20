ALTER TABLE public.courses DROP CONSTRAINT courses_vacancies_check;
ALTER TABLE public.courses ADD CONSTRAINT courses_vacancies_check CHECK (vacancies >= 0);