-- CORREÇÃO DEFINITIVA DO ENUM CAP_STATUS (RESILIENTE A DEPENDÊNCIAS)

DO $$ 
BEGIN
    -- 1. Se o tipo já existir, limpamos as dependências e o removemos
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cap_status' AND typnamespace = 'public'::regnamespace) THEN
        -- Remove o valor padrão que bloqueia o drop
        ALTER TABLE public.patients ALTER COLUMN cap_status DROP DEFAULT;
        
        -- Converte a coluna para TEXT temporariamente para preservar os dados
        ALTER TABLE public.patients ALTER COLUMN cap_status TYPE TEXT USING cap_status::text;
        
        -- Remove o tipo antigo com CASCADE para garantir
        DROP TYPE public.cap_status CASCADE;
    END IF;

    -- 2. Criar o novo tipo com todos os valores necessários
    CREATE TYPE public.cap_status AS ENUM ('aguardando_vaga', 'em_negociacao', 'entrevista_agendada');

    -- 3. Restaurar a coluna para o novo tipo ENUM
    ALTER TABLE public.patients 
        ALTER COLUMN cap_status TYPE public.cap_status 
        USING (
            CASE 
                WHEN cap_status IS NULL OR cap_status = '' THEN NULL
                WHEN cap_status IN ('aguardando_vaga', 'em_negociacao', 'entrevista_agendada') THEN cap_status::public.cap_status
                ELSE 'aguardando_vaga'::public.cap_status
            END
        );

    -- 4. Definir um novo valor padrão seguro
    ALTER TABLE public.patients ALTER COLUMN cap_status SET DEFAULT 'aguardando_vaga'::public.cap_status;

    -- 5. Recarregar o cache
    EXECUTE 'NOTIFY pgrst, ''reload schema''';
END $$;
