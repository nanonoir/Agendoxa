CREATE FUNCTION public.preserve_admin_role_identity() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'The ADMIN system role cannot be deleted'
      USING ERRCODE = '23514', CONSTRAINT = 'admin_role_identity';
  END IF;
  IF ROW(NEW.id, NEW.tenant_id, NEW.system_key) IS DISTINCT FROM ROW(OLD.id, OLD.tenant_id, OLD.system_key) THEN
    RAISE EXCEPTION 'The ADMIN system role must keep its ID, tenant and system key'
      USING ERRCODE = '23514', CONSTRAINT = 'admin_role_identity';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "roles_preserve_admin_identity"
BEFORE DELETE OR UPDATE OF id, tenant_id, system_key ON public.roles
FOR EACH ROW WHEN (OLD.system_key = 'ADMIN')
EXECUTE FUNCTION public.preserve_admin_role_identity();
--> statement-breakpoint
CREATE FUNCTION public.require_remaining_admin_membership() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF ROW(NEW.tenant_id, NEW.role_id, NEW.status)
      IS NOT DISTINCT FROM ROW(OLD.tenant_id, OLD.role_id, OLD.status) THEN
      RETURN NULL;
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.roles
    WHERE tenant_id = OLD.tenant_id AND id = OLD.role_id AND system_key = 'ADMIN'
  ) THEN
    RETURN NULL;
  END IF;

  -- A row write also detects a stale snapshot under REPEATABLE READ.
  UPDATE public.tenants SET updated_at = updated_at WHERE id = OLD.tenant_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_memberships
    WHERE tenant_id = OLD.tenant_id AND role_id = OLD.role_id AND status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'The tenant must retain an active ADMIN membership'
      USING ERRCODE = '23514', CONSTRAINT = 'tenant_last_active_admin';
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "tenant_last_active_admin"
AFTER DELETE OR UPDATE OF tenant_id, role_id, status ON public.tenant_memberships
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW WHEN (OLD.status = 'ACTIVE')
EXECUTE FUNCTION public.require_remaining_admin_membership();
--> statement-breakpoint
CREATE FUNCTION public.require_released_booking_without_active_claims() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  guarded_booking_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'bookings' THEN
    guarded_booking_id := NEW.id;
  ELSE
    guarded_booking_id := NEW.booking_id;
    -- Serialize new active occupancy with updates to the same booking.
    UPDATE public.bookings SET updated_at = updated_at
    WHERE tenant_id = NEW.tenant_id AND id = guarded_booking_id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.bookings AS booking
    JOIN public.slot_claims AS claim
      ON (claim.tenant_id, claim.booking_id) = (booking.tenant_id, booking.id)
    WHERE booking.tenant_id = NEW.tenant_id AND booking.id = guarded_booking_id
      AND booking.status IN ('CANCELLED', 'EXPIRED') AND claim.status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'A cancelled or expired booking cannot hold active occupancy'
      USING ERRCODE = '23514', CONSTRAINT = 'released_booking_no_active_claims';
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "bookings_release_claims"
AFTER UPDATE OF status ON public.bookings
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW WHEN (NEW.status IN ('CANCELLED', 'EXPIRED'))
EXECUTE FUNCTION public.require_released_booking_without_active_claims();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "slot_claims_active_booking_state"
AFTER INSERT ON public.slot_claims
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW WHEN (NEW.status = 'ACTIVE')
EXECUTE FUNCTION public.require_released_booking_without_active_claims();
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.bookings AS booking
    JOIN public.slot_claims AS claim
      ON (claim.tenant_id, claim.booking_id) = (booking.tenant_id, booking.id)
    WHERE booking.status IN ('CANCELLED', 'EXPIRED') AND claim.status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'Existing cancelled or expired booking has active occupancy'
      USING ERRCODE = '23514', CONSTRAINT = 'released_booking_no_active_claims';
  END IF;
END;
$$;
