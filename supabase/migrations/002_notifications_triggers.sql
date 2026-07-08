-- supabase/migrations/002_notifications_triggers.sql
-- Create triggers to generate notifications when likes, comments, listings are created
-- Assumes you have tables: likes, comments, listings, messages (some may be added later)

-- Example: when a new comment is inserted, create a notification for the owner of the target (listing or post)

-- Create helper function to insert notification
CREATE OR REPLACE FUNCTION public.fn_create_notification(target_user uuid, actor uuid, n_type text, payload jsonb)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.notifications(user_id, actor_id, type, payload, created_at)
  VALUES (target_user, actor, n_type, payload, now());
END;
$$;

-- Trigger for comments table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'comments') THEN
    CREATE OR REPLACE FUNCTION public.comments_after_insert_notify()
    RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      -- This assumes comments have: id, owner_id (who wrote), target_user_id (who to notify), target_type, target_id
      PERFORM public.fn_create_notification(NEW.target_user_id::uuid, NEW.owner_id::uuid, 'comment', jsonb_build_object('comment_id', NEW.id, 'target_type', NEW.target_type, 'target_id', NEW.target_id));
      RETURN NEW;
    END;
    $$;

    DROP TRIGGER IF EXISTS comments_after_insert ON public.comments;
    CREATE TRIGGER comments_after_insert
      AFTER INSERT ON public.comments
      FOR EACH ROW EXECUTE FUNCTION public.comments_after_insert_notify();
  END IF;
END$$;

-- Trigger for likes table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'likes') THEN
    CREATE OR REPLACE FUNCTION public.likes_after_insert_notify()
    RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      -- assumes likes table has: id, owner_id (who liked), target_user_id
      PERFORM public.fn_create_notification(NEW.target_user_id::uuid, NEW.owner_id::uuid, 'like', jsonb_build_object('like_id', NEW.id, 'target_id', NEW.target_id, 'target_type', NEW.target_type));
      RETURN NEW;
    END;
    $$;

    DROP TRIGGER IF EXISTS likes_after_insert ON public.likes;
    CREATE TRIGGER likes_after_insert
      AFTER INSERT ON public.likes
      FOR EACH ROW EXECUTE FUNCTION public.likes_after_insert_notify();
  END IF;
END$$;

-- Trigger for messages to mark notification
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
    CREATE OR REPLACE FUNCTION public.messages_after_insert_notify()
    RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      PERFORM public.fn_create_notification(NEW.recipient_id::uuid, NEW.sender_id::uuid, 'message', jsonb_build_object('message_id', NEW.id));
      RETURN NEW;
    END;
    $$;

    DROP TRIGGER IF EXISTS messages_after_insert ON public.messages;
    CREATE TRIGGER messages_after_insert
      AFTER INSERT ON public.messages
      FOR EACH ROW EXECUTE FUNCTION public.messages_after_insert_notify();
  END IF;
END$$;
