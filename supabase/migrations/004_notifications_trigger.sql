-- =====================================================================
-- Migration 004: Auto-notifications trigger
-- Crea notificaciones automáticamente cuando cambia el estado de un pedido
-- =====================================================================

-- Función que genera notificaciones en eventos de orders
CREATE OR REPLACE FUNCTION public.handle_order_notifications()
RETURNS trigger AS $$
BEGIN
  -- ── Pedido nuevo → notificar al dispatcher ──────────────────────────
  IF TG_OP = 'INSERT' AND NEW.dispatcher_id IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, title, body, type)
    VALUES (
      NEW.dispatcher_id,
      'Pedido creado',
      'Pedido ' || NEW.order_number || ' está pendiente de asignación',
      'order_created'
    );
    RETURN NEW;
  END IF;

  -- ── Cambio de estado ────────────────────────────────────────────────
  IF TG_OP = 'UPDATE' AND NEW.status <> OLD.status THEN

    -- Asignado → notificar al rider
    IF NEW.status = 'assigned' AND NEW.rider_id IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, title, body, type)
      VALUES (
        NEW.rider_id,
        '¡Nuevo pedido asignado!',
        'Pedido ' || NEW.order_number || ' listo para recoger',
        'order_assigned'
      );
    END IF;

    -- Entregado → notificar al dispatcher
    IF NEW.status = 'delivered' AND NEW.dispatcher_id IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, title, body, type)
      VALUES (
        NEW.dispatcher_id,
        'Pedido entregado ✓',
        'Pedido ' || NEW.order_number || ' entregado exitosamente',
        'order_delivered'
      );
    END IF;

    -- Cancelado → notificar al dispatcher
    IF NEW.status = 'cancelled' AND NEW.dispatcher_id IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, title, body, type)
      VALUES (
        NEW.dispatcher_id,
        'Pedido cancelado',
        'Pedido ' || NEW.order_number || ' fue cancelado',
        'order_cancelled'
      );
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger sobre la tabla orders
DROP TRIGGER IF EXISTS on_order_notification ON public.orders;
CREATE TRIGGER on_order_notification
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_order_notifications();
