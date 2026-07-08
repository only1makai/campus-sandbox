-- Session 12 (A): split the single 'product' commerce category into two real
-- ones. This file is DELIBERATELY enum-only and applied on its own.
--
-- Why isolated: Postgres forbids USING a freshly ADDed enum value in the same
-- transaction that added it. apply-schema.mjs runs each file as one implicit
-- transaction, so 'thrift' is added-and-committed here, and only referenced
-- from migration 010 onward.
--
--   'product' → 'shop'   recurring sellers (the Makers Market / Marketplace).
--                        RENAME migrates all existing rows in place — no UPDATE.
--   + 'thrift'           one-time used-goods sales (fridge, move-out items).

alter type post_type rename value 'product' to 'shop';
alter type post_type add value if not exists 'thrift';
