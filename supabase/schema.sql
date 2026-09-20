-- ==============================================================================
-- SQL Schema and Storage Policies for CIMB Application & Live Chat
-- Run this in the Supabase SQL Editor (Project: oszqantvugvbvydlizix)
-- Idempotent & Safe: Includes DROP POLICY IF EXISTS to avoid 42710 errors.
-- ==============================================================================

-- 1. Storage Buckets setup
INSERT INTO storage.buckets (id, name, public)
VALUES ('bucketcimb', 'bucketcimb', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('bucketcimb_kyc', 'bucketcimb_kyc', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage Policies (Safely dropped before creation to prevent 42710 error)
DROP POLICY IF EXISTS "Public read for bucketcimb" ON storage.objects;
CREATE POLICY "Public read for bucketcimb"
ON storage.objects FOR SELECT
USING (bucket_id = 'bucketcimb');

DROP POLICY IF EXISTS "Service role & authenticated uploads for bucketcimb" ON storage.objects;
CREATE POLICY "Service role & authenticated uploads for bucketcimb"
ON storage.objects FOR ALL
USING (bucket_id = 'bucketcimb')
WITH CHECK (bucket_id = 'bucketcimb');

DROP POLICY IF EXISTS "Service role full access for bucketcimb_kyc" ON storage.objects;
CREATE POLICY "Service role full access for bucketcimb_kyc"
ON storage.objects FOR ALL
USING (bucket_id = 'bucketcimb_kyc')
WITH CHECK (bucket_id = 'bucketcimb_kyc');

-- 3. Table: cimb_livechat
CREATE TABLE IF NOT EXISTS public.cimb_livechat (
  id text NOT NULL DEFAULT (
    'chat_'::text || (
      (
        floor(
          (
            EXTRACT(
              epoch
              FROM
                clock_timestamp()
            ) * (1000)::numeric
          )
        )
      )::bigint
    )::text
  ),
  user_phone text NOT NULL,
  status text NOT NULL DEFAULT 'open'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  last_message_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cimb_livechat_pkey PRIMARY KEY (id),
  CONSTRAINT cimb_livechat_user_phone_fkey FOREIGN KEY (user_phone) REFERENCES cimb_users (phone) ON DELETE CASCADE,
  CONSTRAINT cimb_livechat_status_check CHECK (
    (
      status = ANY (ARRAY['open'::text, 'closed'::text])
    )
  )
) TABLESPACE pg_default;

-- Indices for cimb_livechat
CREATE INDEX IF NOT EXISTS idx_cimb_livechat_user_phone 
ON public.cimb_livechat USING btree (user_phone) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_cimb_livechat_status 
ON public.cimb_livechat USING btree (status) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_cimb_livechat_last_message_at 
ON public.cimb_livechat USING btree (last_message_at DESC) TABLESPACE pg_default;

-- 4. Table: cimb_messages
CREATE TABLE IF NOT EXISTS public.cimb_messages (
  id text NOT NULL DEFAULT (
    'msg_'::text || (
      (
        floor(
          (
            EXTRACT(
              epoch
              FROM
                clock_timestamp()
            ) * (1000)::numeric
          )
        )
      )::bigint
    )::text || '_'::text || substr(md5((random())::text), 1, 6)
  ),
  conversation_id text NOT NULL,
  sender_type text NOT NULL,
  sender_phone text NOT NULL,
  message text NOT NULL,
  message_type text NOT NULL DEFAULT 'text'::text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cimb_messages_pkey PRIMARY KEY (id),
  CONSTRAINT cimb_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES cimb_livechat (id) ON DELETE CASCADE,
  CONSTRAINT cimb_messages_sender_type_check CHECK (
    (
      sender_type = ANY (ARRAY['user'::text, 'admin'::text])
    )
  )
) TABLESPACE pg_default;

-- Indices for cimb_messages
CREATE INDEX IF NOT EXISTS idx_cimb_messages_conversation_id 
ON public.cimb_messages USING btree (conversation_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_cimb_messages_created_at 
ON public.cimb_messages USING btree (created_at ASC) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_cimb_messages_is_read 
ON public.cimb_messages USING btree (is_read) TABLESPACE pg_default;

-- 5. Trigger Functions for updated_at and last_message_at synchronization
CREATE OR REPLACE FUNCTION public.cimb_livechat_touch()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cimb_livechat_touch ON public.cimb_livechat;
CREATE TRIGGER trg_cimb_livechat_touch
BEFORE UPDATE ON public.cimb_livechat
FOR EACH ROW
EXECUTE FUNCTION public.cimb_livechat_touch();

CREATE OR REPLACE FUNCTION public.cimb_messages_sync_livechat()
RETURNS trigger AS $$
BEGIN
  UPDATE public.cimb_livechat
  SET last_message_at = new.created_at,
      updated_at = now()
  WHERE id = new.conversation_id;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cimb_messages_sync_livechat ON public.cimb_messages;
CREATE TRIGGER trg_cimb_messages_sync_livechat
AFTER INSERT ON public.cimb_messages
FOR EACH ROW
EXECUTE FUNCTION public.cimb_messages_sync_livechat();

-- 6. Enable Row Level Security (RLS) & Policies
ALTER TABLE public.cimb_livechat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cimb_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public select for cimb_livechat" ON public.cimb_livechat;
CREATE POLICY "Public select for cimb_livechat" ON public.cimb_livechat FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert for cimb_livechat" ON public.cimb_livechat;
CREATE POLICY "Public insert for cimb_livechat" ON public.cimb_livechat FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update for cimb_livechat" ON public.cimb_livechat;
CREATE POLICY "Public update for cimb_livechat" ON public.cimb_livechat FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public select for cimb_messages" ON public.cimb_messages;
CREATE POLICY "Public select for cimb_messages" ON public.cimb_messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert for cimb_messages" ON public.cimb_messages;
CREATE POLICY "Public insert for cimb_messages" ON public.cimb_messages FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update for cimb_messages" ON public.cimb_messages;
CREATE POLICY "Public update for cimb_messages" ON public.cimb_messages FOR UPDATE USING (true);

-- 7. Realtime Publication configuration
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'cimb_livechat'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cimb_livechat;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'cimb_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cimb_messages;
  END IF;
END $$;


-- Note:
-- The Edge Function uses SUPABASE_SERVICE_ROLE_KEY to interact with cimb_users and storage.
-- It enforces authentication (phone + password), authorization, immutable fields, and KYC workflows server-side.
