--
-- PostgreSQL database dump
--


-- Dumped from database version 17.7 (Debian 17.7-3.pgdg13+1)
-- Dumped by pg_dump version 17.7 (Debian 17.7-3.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA public;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: cleanup(); Type: PROCEDURE; Schema: public; Owner: -
--

CREATE PROCEDURE public.cleanup()
    LANGUAGE plpgsql
    AS $$
DECLARE
    batch_size                    INTEGER := 1000;
    device_state_affected_rows    INTEGER;
    emergency_state_affected_rows INTEGER;
BEGIN
    LOOP
        DELETE FROM device_state
        WHERE id IN (
            SELECT id FROM device_state
            WHERE "createdAt" < NOW() - INTERVAL '3 months'
            LIMIT batch_size
        );
        GET DIAGNOSTICS device_state_affected_rows = ROW_COUNT;

        DELETE FROM emergency_state
        WHERE id IN (
            SELECT id FROM emergency_state
            WHERE "createdAt" < NOW() - INTERVAL '3 months'
            LIMIT batch_size
        );
        GET DIAGNOSTICS emergency_state_affected_rows = ROW_COUNT;

        RAISE NOTICE 'Deleted: device_state=%, emergency_state=%',
            device_state_affected_rows,
            emergency_state_affected_rows;

        -- Commit each batch to release locks and reduce transaction size
        COMMIT;

        EXIT WHEN device_state_affected_rows = 0 AND emergency_state_affected_rows = 0;

    END LOOP;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: device; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.device (
    id integer NOT NULL,
    code character varying(32),
    name character varying(32),
    description character varying(64),
    "flowId" integer,
    "objectLocationId" integer,
    settings json,
    "updateStateInterval" integer NOT NULL,
    "lastStateUpdate" timestamp with time zone,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "order" integer
);


--
-- Name: COLUMN device."order"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.device."order" IS 'Position in device lists (ascending); NULL = after the ordered devices';


--
-- Name: device_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.device_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: device_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.device_id_seq OWNED BY public.device.id;


--
-- Name: device_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.device_state (
    id integer NOT NULL,
    "deviceId" integer,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    state jsonb
);


--
-- Name: device_state_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.device_state_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: device_state_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.device_state_id_seq OWNED BY public.device_state.id;


--
-- Name: emergency; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emergency (
    id integer NOT NULL,
    "deviceId" integer,
    reasons json,
    "updateStateInterval" integer,
    "lastStateUpdate" timestamp with time zone,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: emergency_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.emergency_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: emergency_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.emergency_id_seq OWNED BY public.emergency.id;


--
-- Name: emergency_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emergency_state (
    id integer NOT NULL,
    "deviceId" integer,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    state jsonb
);


--
-- Name: emergency_state_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.emergency_state_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: emergency_state_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.emergency_state_id_seq OWNED BY public.emergency_state.id;


--
-- Name: flow; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flow (
    id integer NOT NULL,
    code character varying(32),
    name character varying(32),
    description character varying(64),
    uid character varying(16),
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: flow_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.flow_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: flow_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.flow_id_seq OWNED BY public.flow.id;


--
-- Name: mnemoschema_selector; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mnemoschema_selector (
    id integer NOT NULL,
    "deviceId" integer NOT NULL,
    "sourceDeviceId" integer NOT NULL,
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone
);


--
-- Name: mnemoschema_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mnemoschema_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mnemoschema_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mnemoschema_id_seq OWNED BY public.mnemoschema_selector.id;


--
-- Name: object_location; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.object_location (
    id integer NOT NULL,
    latitude numeric(10,8) NOT NULL,
    longitude numeric(11,8) NOT NULL,
    address character varying(128),
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: object_location_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.object_location_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: object_location_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.object_location_id_seq OWNED BY public.object_location.id;


--
-- Name: report; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report (
    id integer NOT NULL,
    code character varying(64) NOT NULL,
    description character varying(128) NOT NULL,
    "deviceId" integer,
    url text NOT NULL,
    settings json,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: report1_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.report1_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: report1_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.report1_id_seq OWNED BY public.report.id;


--
-- Name: user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."user" (
    id integer NOT NULL,
    name character varying(32),
    password character varying(128),
    "roleId" integer NOT NULL,
    settings json,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: user_device_link; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_device_link (
    id integer NOT NULL,
    "userId" integer,
    "deviceId" integer,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: user_device_link_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_device_link_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_device_link_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_device_link_id_seq OWNED BY public.user_device_link.id;


--
-- Name: user_new_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_new_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_new_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_new_id_seq OWNED BY public."user".id;


--
-- Name: device id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device ALTER COLUMN id SET DEFAULT nextval('public.device_id_seq'::regclass);


--
-- Name: device_state id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_state ALTER COLUMN id SET DEFAULT nextval('public.device_state_id_seq'::regclass);


--
-- Name: emergency id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency ALTER COLUMN id SET DEFAULT nextval('public.emergency_id_seq'::regclass);


--
-- Name: emergency_state id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency_state ALTER COLUMN id SET DEFAULT nextval('public.emergency_state_id_seq'::regclass);


--
-- Name: flow id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flow ALTER COLUMN id SET DEFAULT nextval('public.flow_id_seq'::regclass);


--
-- Name: mnemoschema_selector id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mnemoschema_selector ALTER COLUMN id SET DEFAULT nextval('public.mnemoschema_id_seq'::regclass);


--
-- Name: object_location id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.object_location ALTER COLUMN id SET DEFAULT nextval('public.object_location_id_seq'::regclass);


--
-- Name: report id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report ALTER COLUMN id SET DEFAULT nextval('public.report1_id_seq'::regclass);


--
-- Name: user id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user" ALTER COLUMN id SET DEFAULT nextval('public.user_new_id_seq'::regclass);


--
-- Name: user_device_link id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_device_link ALTER COLUMN id SET DEFAULT nextval('public.user_device_link_id_seq'::regclass);


--
-- Name: device device_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device
    ADD CONSTRAINT device_pkey PRIMARY KEY (id);


--
-- Name: device_state device_state_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_state
    ADD CONSTRAINT device_state_pkey PRIMARY KEY (id);


--
-- Name: emergency emergency_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency
    ADD CONSTRAINT emergency_pkey PRIMARY KEY (id);


--
-- Name: emergency_state emergency_state_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency_state
    ADD CONSTRAINT emergency_state_pkey PRIMARY KEY (id);


--
-- Name: flow flow_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flow
    ADD CONSTRAINT flow_pkey PRIMARY KEY (id);


--
-- Name: mnemoschema_selector mnemoschema_deviceid_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mnemoschema_selector
    ADD CONSTRAINT mnemoschema_deviceid_unique UNIQUE ("deviceId");


--
-- Name: mnemoschema_selector mnemoschema_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mnemoschema_selector
    ADD CONSTRAINT mnemoschema_pkey PRIMARY KEY (id);


--
-- Name: object_location object_location_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.object_location
    ADD CONSTRAINT object_location_pkey PRIMARY KEY (id);


--
-- Name: report report1_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report
    ADD CONSTRAINT report1_pkey PRIMARY KEY (id);


--
-- Name: user_device_link user_device_link_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_device_link
    ADD CONSTRAINT user_device_link_pkey PRIMARY KEY (id);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: idx_device_state_device_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_device_state_device_created ON public.device_state USING btree ("deviceId", "createdAt" DESC);


--
-- Name: idx_emergency_state_device; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emergency_state_device ON public.emergency_state USING btree ("deviceId", "createdAt" DESC);


--
-- Name: device device_flowId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device
    ADD CONSTRAINT "device_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES public.flow(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: device device_objectLocationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device
    ADD CONSTRAINT "device_objectLocationId_fkey" FOREIGN KEY ("objectLocationId") REFERENCES public.object_location(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: device_state device_state_deviceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_state
    ADD CONSTRAINT "device_state_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES public.device(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: emergency emergency_deviceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency
    ADD CONSTRAINT "emergency_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES public.device(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: emergency_state emergency_state_deviceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency_state
    ADD CONSTRAINT "emergency_state_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES public.device(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: mnemoschema_selector mnemoschema_deviceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mnemoschema_selector
    ADD CONSTRAINT "mnemoschema_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES public.device(id);


--
-- Name: mnemoschema_selector mnemoschema_sourceDeviceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mnemoschema_selector
    ADD CONSTRAINT "mnemoschema_sourceDeviceId_fkey" FOREIGN KEY ("sourceDeviceId") REFERENCES public.device(id);


--
-- Name: report report1_deviceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report
    ADD CONSTRAINT "report1_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES public.device(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: user_device_link user_device_link_deviceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_device_link
    ADD CONSTRAINT "user_device_link_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES public.device(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_device_link user_device_link_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_device_link
    ADD CONSTRAINT "user_device_link_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--


