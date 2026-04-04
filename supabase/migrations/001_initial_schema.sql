-- ============================================================
-- CATHOLIC APP — INITIAL SCHEMA
-- Migration: 001_initial_schema.sql
-- ============================================================

-- ── SECTION A: Extensions ─────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── SECTION B: ENUM types ─────────────────────────────────
CREATE TYPE vocation_state AS ENUM (
  'single', 'married', 'religious', 'ordained'
);

CREATE TYPE group_category AS ENUM (
  'parish', 'diocese', 'interest', 'vocation',
  'rcia', 'mens', 'womens', 'young_adults', 'families', 'other'
);

CREATE TYPE group_role AS ENUM ('member', 'moderator', 'admin');

CREATE TYPE group_join_status AS ENUM ('pending', 'approved', 'denied');

CREATE TYPE notification_type AS ENUM (
  'like', 'comment', 'group_invite', 'group_request',
  'group_request_response', 'parish_post', 'prayer_response',
  'confession_reminder', 'direct_message', 'event_reminder'
);

CREATE TYPE event_visibility AS ENUM ('public', 'parish_only', 'group_only');

CREATE TYPE rsvp_response AS ENUM ('yes', 'maybe', 'no');

CREATE TYPE flag_reason AS ENUM (
  'spam', 'hateful', 'misinformation', 'violates_values', 'other'
);

CREATE TYPE parish_admin_role AS ENUM ('admin', 'staff');

-- ── SECTION C: Tables ─────────────────────────────────────

-- 1. parishes
CREATE TABLE parishes (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name            text NOT NULL,
  diocese         text,
  address         text,
  city            text,
  state           text,
  zip             text,
  country         text DEFAULT 'US',
  phone           text,
  website         text,
  email           text,
  latitude        double precision,
  longitude       double precision,
  is_official     boolean DEFAULT false,
  mass_times      jsonb,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- 2. profiles (references auth.users and parishes)
CREATE TABLE profiles (
  id                  uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name           text,
  username            text UNIQUE,
  bio                 text,
  avatar_url          text,
  parish_id           uuid REFERENCES parishes(id) ON DELETE SET NULL,
  vocation_state      vocation_state,
  is_premium          boolean DEFAULT false,
  is_patron           boolean DEFAULT false,
  is_admin            boolean DEFAULT false,
  is_verified_clergy  boolean DEFAULT false,
  premium_expires_at  timestamptz,
  stripe_customer_id  text,
  last_active_at      timestamptz,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- 3. parish_admins
CREATE TABLE parish_admins (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  parish_id  uuid NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role       parish_admin_role NOT NULL DEFAULT 'staff',
  created_at timestamptz DEFAULT now(),
  UNIQUE(parish_id, user_id)
);

-- 4. groups (create before posts to avoid circular FK)
CREATE TABLE groups (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text NOT NULL,
  description text,
  category    group_category NOT NULL DEFAULT 'other',
  avatar_url  text,
  parish_id   uuid REFERENCES parishes(id) ON DELETE SET NULL,
  creator_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_private  boolean DEFAULT false,
  member_count integer DEFAULT 1,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- 5. posts (references profiles, parishes, groups)
CREATE TABLE posts (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parish_id       uuid REFERENCES parishes(id) ON DELETE CASCADE,
  group_id        uuid REFERENCES groups(id) ON DELETE CASCADE,
  content         text NOT NULL CHECK (char_length(content) <= 500),
  image_url       text,
  is_prayer_request boolean DEFAULT false,
  is_anonymous    boolean DEFAULT false,
  is_removed      boolean DEFAULT false,
  like_count      integer DEFAULT 0,
  comment_count   integer DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  deleted_at      timestamptz
);

-- 6. group_members
CREATE TABLE group_members (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id   uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role       group_role NOT NULL DEFAULT 'member',
  joined_at  timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- 7. group_join_requests
CREATE TABLE group_join_requests (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id    uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status      group_join_status NOT NULL DEFAULT 'pending',
  message     text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- 8. comments
CREATE TABLE comments (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id     uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content     text NOT NULL CHECK (char_length(content) <= 500),
  is_removed  boolean DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- 9. likes
CREATE TABLE likes (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id    uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- 10. prayer_requests
CREATE TABLE prayer_requests (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parish_id     uuid REFERENCES parishes(id) ON DELETE SET NULL,
  content       text NOT NULL CHECK (char_length(content) <= 500),
  is_anonymous  boolean DEFAULT false,
  prayer_count  integer DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

-- 11. prayer_responses
CREATE TABLE prayer_responses (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  prayer_request_id uuid NOT NULL REFERENCES prayer_requests(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at        timestamptz DEFAULT now(),
  UNIQUE(prayer_request_id, user_id)
);

-- 12. events
CREATE TABLE events (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title       text NOT NULL,
  description text,
  parish_id   uuid REFERENCES parishes(id) ON DELETE CASCADE,
  group_id    uuid REFERENCES groups(id) ON DELETE CASCADE,
  creator_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_time  timestamptz NOT NULL,
  end_time    timestamptz,
  location    text,
  visibility  event_visibility NOT NULL DEFAULT 'public',
  rsvp_count  integer DEFAULT 0,
  image_url   text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- 13. event_rsvps
CREATE TABLE event_rsvps (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id   uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  response   rsvp_response NOT NULL DEFAULT 'yes',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- 14. direct_messages
CREATE TABLE direct_messages (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content      text NOT NULL,
  is_read      boolean DEFAULT false,
  created_at   timestamptz DEFAULT now()
);

-- 15. notifications
CREATE TABLE notifications (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type         notification_type NOT NULL,
  reference_id uuid,
  message      text,
  is_read      boolean DEFAULT false,
  created_at   timestamptz DEFAULT now()
);

-- 16. post_flags
CREATE TABLE post_flags (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id    uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason     flag_reason NOT NULL DEFAULT 'other',
  notes      text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- 17. scheduled_posts
CREATE TABLE scheduled_posts (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parish_id     uuid REFERENCES parishes(id) ON DELETE CASCADE,
  content       text NOT NULL,
  image_url     text,
  scheduled_for timestamptz NOT NULL,
  published     boolean DEFAULT false,
  created_at    timestamptz DEFAULT now()
);

-- 18. saints
CREATE TABLE saints (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name         text NOT NULL,
  feast_day    text, -- format: MM-DD
  birth_year   integer,
  death_year   integer,
  summary      text,
  biography    text, -- premium only
  patron_of    text[],
  prayer       text,
  image_url    text,
  created_at   timestamptz DEFAULT now()
);

-- 19. saint_favorites
CREATE TABLE saint_favorites (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  saint_id   uuid NOT NULL REFERENCES saints(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, saint_id)
);

-- 20. confession_tracker
CREATE TABLE confession_tracker (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  confessed_at  date NOT NULL DEFAULT CURRENT_DATE,
  notes         text, -- private notes, never shown to others
  created_at    timestamptz DEFAULT now()
);

-- 21. notification_preferences
CREATE TABLE notification_preferences (
  id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id              uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  likes                boolean DEFAULT true,
  comments             boolean DEFAULT true,
  group_invites        boolean DEFAULT true,
  group_requests       boolean DEFAULT true,
  parish_posts         boolean DEFAULT true,
  prayer_responses     boolean DEFAULT true,
  confession_reminder  boolean DEFAULT true,
  direct_messages      boolean DEFAULT true,
  event_reminders      boolean DEFAULT true,
  reminder_interval_days integer DEFAULT 30,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

-- 22. push_subscriptions
CREATE TABLE push_subscriptions (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint   text NOT NULL UNIQUE,
  p256dh     text NOT NULL,
  auth       text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 23. parish_follows
CREATE TABLE parish_follows (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parish_id  uuid NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, parish_id)
);

-- ── SECTION D: Indexes ─────────────────────────────────────
CREATE INDEX ON parishes (latitude, longitude);
CREATE INDEX ON profiles (parish_id);
CREATE INDEX ON posts (author_id);
CREATE INDEX ON posts (parish_id);
CREATE INDEX ON posts (group_id);
CREATE INDEX ON posts (created_at DESC);
CREATE INDEX ON posts (deleted_at);
CREATE INDEX ON comments (post_id);
CREATE INDEX ON likes (post_id);
CREATE INDEX ON likes (user_id);
CREATE INDEX ON group_members (group_id);
CREATE INDEX ON group_members (user_id);
CREATE INDEX ON group_join_requests (group_id);
CREATE INDEX ON prayer_requests (parish_id);
CREATE INDEX ON prayer_responses (prayer_request_id);
CREATE INDEX ON events (parish_id);
CREATE INDEX ON events (group_id);
CREATE INDEX ON events (start_time);
CREATE INDEX ON notifications (user_id, is_read);
CREATE INDEX ON direct_messages (sender_id);
CREATE INDEX ON direct_messages (recipient_id);
CREATE INDEX ON saints (feast_day);
CREATE INDEX ON confession_tracker (user_id);
CREATE INDEX ON parish_follows (user_id);
CREATE INDEX ON parish_follows (parish_id);

-- ── SECTION E: Row Level Security ─────────────────────────
ALTER TABLE parishes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE parish_admins          ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members          ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_join_requests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_requests        ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_responses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE events                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rsvps            ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_flags             ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_posts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE saints                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE saint_favorites        ENABLE ROW LEVEL SECURITY;
ALTER TABLE confession_tracker     ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE parish_follows         ENABLE ROW LEVEL SECURITY;

-- Parishes: anyone can read
CREATE POLICY "Parishes are publicly readable"
  ON parishes FOR SELECT USING (true);

-- Profiles: anyone can read, only own user can write
CREATE POLICY "Profiles are publicly readable"
  ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Posts: authenticated users can read non-deleted posts
CREATE POLICY "Authenticated users can read posts"
  ON posts FOR SELECT
  USING (auth.role() = 'authenticated' AND deleted_at IS NULL);
CREATE POLICY "Users can create posts"
  ON posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Users can soft-delete own posts"
  ON posts FOR DELETE USING (auth.uid() = author_id);

-- Groups: public groups visible to all authenticated users
CREATE POLICY "Authenticated users can read groups"
  ON groups FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can create groups"
  ON groups FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Group creators can update groups"
  ON groups FOR UPDATE USING (auth.uid() = creator_id);

-- Group members: members can see membership lists
CREATE POLICY "Authenticated users can view group members"
  ON group_members FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can join groups"
  ON group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave groups"
  ON group_members FOR DELETE USING (auth.uid() = user_id);

-- Comments: authenticated users can read and write
CREATE POLICY "Authenticated users can read comments"
  ON comments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can create comments"
  ON comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE USING (auth.uid() = author_id);

-- Likes
CREATE POLICY "Authenticated users can read likes"
  ON likes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can like posts"
  ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike posts"
  ON likes FOR DELETE USING (auth.uid() = user_id);

-- Prayer requests
CREATE POLICY "Authenticated users can read prayer requests"
  ON prayer_requests FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can create prayer requests"
  ON prayer_requests FOR INSERT WITH CHECK (auth.uid() = author_id);

-- Prayer responses
CREATE POLICY "Authenticated users can read prayer responses"
  ON prayer_responses FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can respond to prayers"
  ON prayer_responses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own prayer responses"
  ON prayer_responses FOR DELETE USING (auth.uid() = user_id);

-- Events
CREATE POLICY "Authenticated users can read events"
  ON events FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can create events"
  ON events FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Event creators can update events"
  ON events FOR UPDATE USING (auth.uid() = creator_id);

-- Event RSVPs
CREATE POLICY "Authenticated users can read rsvps"
  ON event_rsvps FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can rsvp to events"
  ON event_rsvps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own rsvp"
  ON event_rsvps FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can remove own rsvp"
  ON event_rsvps FOR DELETE USING (auth.uid() = user_id);

-- Notifications: users can only see their own
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Direct messages
CREATE POLICY "Users can view their own messages"
  ON direct_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "Users can send messages"
  ON direct_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Saints: publicly readable
CREATE POLICY "Saints are publicly readable"
  ON saints FOR SELECT USING (true);

-- Saint favorites: own only
CREATE POLICY "Users can view own favorites"
  ON saint_favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add favorites"
  ON saint_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove favorites"
  ON saint_favorites FOR DELETE USING (auth.uid() = user_id);

-- ── CONFESSION TRACKER — MAXIMUM PRIVACY ──────────────────
-- NO other policies. NO admin access. NO exceptions.
CREATE POLICY "Users can view own confession records"
  ON confession_tracker FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own confession records"
  ON confession_tracker FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own confession records"
  ON confession_tracker FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own confession records"
  ON confession_tracker FOR DELETE USING (auth.uid() = user_id);

-- Notification preferences
CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Push subscriptions
CREATE POLICY "Users can manage own push subscriptions"
  ON push_subscriptions FOR ALL USING (auth.uid() = user_id);

-- Parish follows
CREATE POLICY "Users can view own follows"
  ON parish_follows FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can follow parishes"
  ON parish_follows FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unfollow parishes"
  ON parish_follows FOR DELETE USING (auth.uid() = user_id);

-- Post flags
CREATE POLICY "Users can flag posts"
  ON post_flags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own flags"
  ON post_flags FOR SELECT USING (auth.uid() = user_id);

-- ── SECTION F: Functions & Triggers ───────────────────────

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_event_rsvps_updated_at
  BEFORE UPDATE ON event_rsvps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update prayer_count
CREATE OR REPLACE FUNCTION update_prayer_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE prayer_requests
      SET prayer_count = prayer_count + 1
      WHERE id = NEW.prayer_request_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE prayer_requests
      SET prayer_count = GREATEST(prayer_count - 1, 0)
      WHERE id = OLD.prayer_request_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_prayer_response_change
  AFTER INSERT OR DELETE ON prayer_responses
  FOR EACH ROW EXECUTE FUNCTION update_prayer_count();
