-- public.jugadores definition

-- Drop table

-- DROP TABLE public.jugadores;

CREATE TABLE public.jugadores (
	id serial4 NOT NULL,
	nombre varchar(50) NOT NULL,
	partidas_jugadas int4 DEFAULT 0 NULL,
	partidas_ganadas int4 DEFAULT 0 NULL,
	partidas_perdidas int4 DEFAULT 0 NULL,
	partidas_empatadas int4 DEFAULT 0 NULL,
	created_at timestamp DEFAULT now() NULL,
	CONSTRAINT jugadores_nombre_key UNIQUE (nombre),
	CONSTRAINT jugadores_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX unique_nombre_lower ON public.jugadores USING btree (lower((nombre)::text));

-- Permissions

ALTER TABLE public.jugadores OWNER TO postgres;
GRANT ALL ON TABLE public.jugadores TO postgres;


-- public.partidas definition

-- Drop table

-- DROP TABLE public.partidas;

CREATE TABLE public.partidas (
	id serial4 NOT NULL,
	jugador1_id int4 NULL,
	jugador2_id int4 NULL,
	ganador_id int4 NULL,
	fecha timestamp DEFAULT now() NULL,
	CONSTRAINT partidas_pkey PRIMARY KEY (id),
	CONSTRAINT partidas_ganador_id_fkey FOREIGN KEY (ganador_id) REFERENCES public.jugadores(id) ON DELETE SET NULL,
	CONSTRAINT partidas_jugador1_id_fkey FOREIGN KEY (jugador1_id) REFERENCES public.jugadores(id) ON DELETE CASCADE,
	CONSTRAINT partidas_jugador2_id_fkey FOREIGN KEY (jugador2_id) REFERENCES public.jugadores(id) ON DELETE CASCADE
);

-- DROP FUNCTION public.actualizar_estadisticas();

CREATE OR REPLACE FUNCTION public.actualizar_estadisticas()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Empate
    IF NEW.ganador_id IS NULL THEN
        UPDATE jugadores
        SET partidas_empatadas = partidas_empatadas + 1,
            partidas_jugadas = partidas_jugadas + 1
        WHERE id IN (NEW.jugador1_id, NEW.jugador2_id);
    ELSE
        -- Ganador
        UPDATE jugadores
        SET partidas_ganadas = partidas_ganadas + 1,
            partidas_jugadas = partidas_jugadas + 1
        WHERE id = NEW.ganador_id;

        -- Perdedor
        UPDATE jugadores
        SET partidas_perdidas = partidas_perdidas + 1,
            partidas_jugadas = partidas_jugadas + 1
        WHERE id IN (NEW.jugador1_id, NEW.jugador2_id)
          AND id <> NEW.ganador_id;
    END IF;

    RETURN NEW;
END;
$function$
;

-- Permissions

ALTER FUNCTION public.actualizar_estadisticas() OWNER TO postgres;
GRANT ALL ON FUNCTION public.actualizar_estadisticas() TO postgres;


-- Table Triggers

create trigger trigger_estadisticas after
insert
    on
    public.partidas for each row execute function actualizar_estadisticas();

-- Permissions

ALTER TABLE public.partidas OWNER TO postgres;
GRANT ALL ON TABLE public.partidas TO postgres;