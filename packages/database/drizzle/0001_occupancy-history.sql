CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "slot_claims"
  ADD CONSTRAINT "slot_claims_no_active_overlap"
  EXCLUDE USING gist (
    "tenant_id" WITH =,
    "resource_id" WITH =,
    tstzrange("start_at", "end_at", '[)') WITH &&
  ) WHERE ("status" = 'ACTIVE');
--> statement-breakpoint
CREATE FUNCTION "preserve_slot_claim_history"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Occupancy claims cannot be deleted' USING ERRCODE = '23514';
  END IF;
  IF OLD.status = 'CLOSED' THEN
    RAISE EXCEPTION 'Closed occupancy claims are immutable' USING ERRCODE = '23514';
  END IF;
  IF ROW(NEW.id, NEW.tenant_id, NEW.resource_id, NEW.booking_id, NEW.kind, NEW.start_at, NEW.end_at, NEW.created_at)
    IS DISTINCT FROM
    ROW(OLD.id, OLD.tenant_id, OLD.resource_id, OLD.booking_id, OLD.kind, OLD.start_at, OLD.end_at, OLD.created_at) THEN
    RAISE EXCEPTION 'Replace occupancy by closing the old claim and creating a new one' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "slot_claims_preserve_history"
BEFORE UPDATE OR DELETE ON "slot_claims"
FOR EACH ROW EXECUTE FUNCTION "preserve_slot_claim_history"();
--> statement-breakpoint
CREATE FUNCTION "reject_history_change"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'History in % cannot be updated or deleted', TG_TABLE_NAME USING ERRCODE = '23514';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "booking_events_append_only"
BEFORE UPDATE OR DELETE ON "booking_events"
FOR EACH ROW EXECUTE FUNCTION "reject_history_change"();
--> statement-breakpoint
CREATE TRIGGER "bookings_preserve_history"
BEFORE DELETE ON "bookings"
FOR EACH ROW EXECUTE FUNCTION "reject_history_change"();
