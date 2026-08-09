ALTER TABLE wallets ADD COLUMN IF NOT EXISTS balance bigint NOT NULL DEFAULT 0 CHECK(balance>=0);
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS earnings bigint NOT NULL DEFAULT 0 CHECK(earnings>=0);
ALTER TABLE gifts ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT '#6257f5';
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS bucket text NOT NULL DEFAULT 'spendable' CHECK(bucket IN ('spendable','earnings'));

CREATE TABLE IF NOT EXISTS gift_transfers (
  id uuid PRIMARY KEY,
  idempotency_key text NOT NULL,
  sender_id uuid NOT NULL REFERENCES users(id),
  recipient_id uuid NOT NULL REFERENCES users(id),
  gift_id text NOT NULL REFERENCES gifts(id),
  quantity int NOT NULL CHECK(quantity BETWEEN 1 AND 99),
  gross_amount bigint NOT NULL CHECK(gross_amount>0),
  creator_amount bigint NOT NULL CHECK(creator_amount>=0),
  platform_amount bigint NOT NULL CHECK(platform_amount>=0),
  currency text NOT NULL DEFAULT 'LUMEN',
  live_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(sender_id,idempotency_key),
  CHECK(sender_id<>recipient_id),
  CHECK(gross_amount=creator_amount+platform_amount)
);

CREATE TABLE IF NOT EXISTS platform_ledger_entries (
  id uuid PRIMARY KEY,
  direction text NOT NULL CHECK(direction IN ('debit','credit')),
  amount bigint NOT NULL CHECK(amount>0),
  currency text NOT NULL DEFAULT 'LUMEN',
  reason text NOT NULL,
  correlation_id uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gift_transfers_sender_idx ON gift_transfers(sender_id,created_at DESC);
CREATE INDEX IF NOT EXISTS gift_transfers_recipient_idx ON gift_transfers(recipient_id,created_at DESC);

INSERT INTO gifts(id,name,tier,price,enabled,color) VALUES
  ('pulse','Sylora Pulse','basic',25,true,'#5b5cf6'),
  ('nova','Nova Bloom','premium',250,true,'#d75cff'),
  ('aurora','Aurora Crown','epic',1000,true,'#24d9e8'),
  ('cosmos','Cosmic Phoenix','legendary',5000,true,'#ff9d4d')
ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,tier=EXCLUDED.tier,price=EXCLUDED.price,enabled=EXCLUDED.enabled,color=EXCLUDED.color;
