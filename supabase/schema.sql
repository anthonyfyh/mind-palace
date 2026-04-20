-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── SUBJECTS ────────────────────────────────────────────────────────────────
create table subjects (
  id   serial primary key,
  name text not null unique,
  slug text not null unique
);

insert into subjects (name, slug) values
  ('Productivity', 'productivity'),
  ('Personal Finance', 'personal-finance'),
  ('Career', 'career'),
  ('Economics', 'economics'),
  ('Life Skills', 'life-skills');

-- ─── PROFILES ────────────────────────────────────────────────────────────────
create table profiles (
  id           uuid primary key references auth.users on delete cascade,
  username     text unique not null,
  display_name text,
  bio          text,
  avatar_url   text,
  created_at   timestamptz default now()
);

-- ─── TOPICS ──────────────────────────────────────────────────────────────────
-- A topic is the shared subject that multiple creators contribute to
create table topics (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  description text,
  subject_id  integer references subjects(id),
  created_by  uuid not null references profiles(id),
  created_at  timestamptz default now()
);

-- ─── POSTS ───────────────────────────────────────────────────────────────────
-- A post is one creator's contribution to a topic
-- type: solution | framework | concept | process
create table posts (
  id          uuid primary key default uuid_generate_v4(),
  topic_id    uuid not null references topics(id) on delete cascade,
  author_id   uuid not null references profiles(id) on delete cascade,
  type        text not null check (type in ('solution', 'framework', 'concept', 'process')),
  title       text not null,
  content     jsonb not null default '[]',
  is_draft    boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ─── COLLECTIONS ─────────────────────────────────────────────────────────────
-- A collection is a creator's album — an ordered group of their posts
create table collections (
  id          uuid primary key default uuid_generate_v4(),
  author_id   uuid references profiles(id) on delete cascade,
  title       text not null,
  description text,
  subject_id  integer references subjects(id),
  is_draft    boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table collection_posts (
  collection_id uuid references collections(id) on delete cascade,
  post_id       uuid references posts(id) on delete cascade,
  position      integer not null,
  primary key (collection_id, post_id)
);

-- ─── TOPIC RELATIONS ─────────────────────────────────────────────────────────
-- Edges in the mind map graph — one row per post-mention pair.
-- post_id cascades on delete; graph queries use DISTINCT (from_id, to_id).
create table topic_relations (
  post_id uuid not null references posts(id) on delete cascade,
  from_id uuid not null references topics(id) on delete cascade,
  to_id   uuid not null references topics(id) on delete cascade,
  primary key (post_id, to_id)
);

-- ─── FOLLOWS ─────────────────────────────────────────────────────────────────
create table follows (
  follower_id  uuid references profiles(id) on delete cascade,
  following_id uuid references profiles(id) on delete cascade,
  created_at   timestamptz default now(),
  primary key (follower_id, following_id)
);

-- ─── COMMENTS ────────────────────────────────────────────────────────────────
create table comments (
  id          uuid primary key default uuid_generate_v4(),
  post_id     uuid not null references posts(id) on delete cascade,
  author_id   uuid not null references profiles(id) on delete cascade,
  body        text not null,
  created_at  timestamptz default now()
);

-- ─── LIKES ───────────────────────────────────────────────────────────────────
create table likes (
  post_id    uuid not null references posts(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────────────────
alter table profiles enable row level security;
alter table topics enable row level security;
alter table posts enable row level security;
alter table collections enable row level security;
alter table collection_posts enable row level security;
alter table topic_relations enable row level security;
alter table follows enable row level security;
alter table comments enable row level security;
alter table likes enable row level security;

-- Profiles: public read, owner write
create policy "Public profiles are viewable by everyone" on profiles for select using (true);
create policy "Users can insert their own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users can update their own profile" on profiles for update using (auth.uid() = id);

-- Topics: public read, authenticated create, creator can update
create policy "Topics are viewable by everyone" on topics for select using (true);
create policy "Authenticated users can create topics" on topics for insert with check (auth.uid() = created_by);
create policy "Creators can update their own topics" on topics for update using (auth.uid() = created_by);

-- Posts: published posts are public; drafts only visible to author
create policy "Published posts are viewable by everyone" on posts for select using (is_draft = false or author_id = auth.uid());
create policy "Authors can insert their own posts" on posts for insert with check (auth.uid() = author_id);
create policy "Authors can update their own posts" on posts for update using (auth.uid() = author_id);
create policy "Authors can delete their own posts" on posts for delete using (auth.uid() = author_id);

-- Collections: same as posts
create policy "Published collections are viewable by everyone" on collections for select using (is_draft = false or author_id = auth.uid());
create policy "Authors can insert their own collections" on collections for insert with check (auth.uid() = author_id);
create policy "Authors can update their own collections" on collections for update using (auth.uid() = author_id);
create policy "Authors can delete their own collections" on collections for delete using (auth.uid() = author_id);

-- Collection posts: readable if collection is readable
create policy "Collection posts viewable by everyone" on collection_posts for select using (true);
create policy "Authors manage their collection posts" on collection_posts for all using (
  exists (select 1 from collections where id = collection_id and author_id = auth.uid())
);

-- Topic relations: public read, post author can insert/delete
create policy "Topic relations are viewable by everyone" on topic_relations for select using (true);
create policy "Post authors can create relations" on topic_relations for insert with check (
  exists (select 1 from posts where id = post_id and author_id = auth.uid())
);
create policy "Post authors can delete their relations" on topic_relations for delete using (
  exists (select 1 from posts where id = post_id and author_id = auth.uid())
);

-- Follows: public read, owner write
create policy "Follows are viewable by everyone" on follows for select using (true);
create policy "Users can follow others" on follows for insert with check (auth.uid() = follower_id);
create policy "Users can unfollow" on follows for delete using (auth.uid() = follower_id);

-- Comments: public read, authenticated write — author must match auth.uid()
create policy "Comments are viewable by everyone" on comments for select using (true);
create policy "Authenticated users can comment" on comments for insert with check (auth.uid() = author_id);
create policy "Authors can delete their own comments" on comments for delete using (auth.uid() = author_id);

-- Likes: public read, users can like/unlike their own rows
create policy "Likes are viewable by everyone" on likes for select using (true);
create policy "Authenticated users can like" on likes for insert with check (auth.uid() = user_id);
create policy "Users can unlike" on likes for delete using (auth.uid() = user_id);

-- ─── BOOKMARKS ───────────────────────────────────────────────────────────────
create table bookmarks (
  post_id    uuid not null references posts(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);

-- Bookmarks: private — only owner can see and manage
alter table bookmarks enable row level security;
create policy "Users can view their own bookmarks" on bookmarks for select using (auth.uid() = user_id);
create policy "Users can bookmark posts" on bookmarks for insert with check (auth.uid() = user_id);
create policy "Users can remove their bookmarks" on bookmarks for delete using (auth.uid() = user_id);

-- ─── NOTIFICATIONS ───────────────────────────────────────────────────────────
-- type: new_contribution (someone posted to a topic you created)
--       new_comment      (someone commented on your post)
create table notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references profiles(id) on delete cascade,
  actor_id   uuid not null references profiles(id) on delete cascade,
  type       text not null check (type in ('new_contribution', 'new_comment')),
  post_id    uuid references posts(id) on delete cascade,
  topic_id   uuid references topics(id) on delete cascade,
  read       boolean not null default false,
  created_at timestamptz default now()
);

alter table notifications enable row level security;

create policy "Users can view their own notifications" on notifications
  for select using (auth.uid() = user_id);

create policy "Authenticated users can insert notifications" on notifications
  for insert with check (auth.uid() = actor_id);

create policy "Users can update their own notifications" on notifications
  for update using (auth.uid() = user_id);

-- ─── STORAGE: AVATARS BUCKET ─────────────────────────────────────────────────
-- Run this in the Supabase dashboard SQL editor (storage schema is managed by Supabase):
--
--   insert into storage.buckets (id, name, public)
--   values ('avatars', 'avatars', true)
--   on conflict do nothing;
--
--   create policy "Anyone can view avatars" on storage.objects
--     for select using (bucket_id = 'avatars');
--
--   create policy "Authenticated users can upload their own avatar" on storage.objects
--     for insert with check (bucket_id = 'avatars' and auth.uid()::text = split_part(name, '.', 1));
--
--   create policy "Users can update their own avatar" on storage.objects
--     for update using (bucket_id = 'avatars' and auth.uid()::text = split_part(name, '.', 1));

-- ─── AUTO-CREATE PROFILE ON SIGNUP ──────────────────────────────────────────
-- Captures avatar_url and full_name from Google OAuth metadata when available.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'username',
      new.raw_user_meta_data->>'preferred_username',
      new.raw_user_meta_data->>'user_name',
      split_part(new.email, '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── SUBSCRIPTIONS ───────────────────────────────────────────────────────────
-- type 'topic'   → entity_id is a topics.id
-- type 'subject' → entity_id is a subjects.id
create table subscriptions (
  user_id    uuid not null references profiles(id) on delete cascade,
  type       text not null check (type in ('topic', 'subject')),
  entity_id  text not null,  -- uuid for topics, integer string for subjects
  created_at timestamptz default now(),
  primary key (user_id, type, entity_id)
);
alter table subscriptions enable row level security;
create policy "Users can manage their own subscriptions" on subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── NOTIFICATIONS: add new_post type ────────────────────────────────────────
-- For existing databases run:
--   alter table notifications drop constraint notifications_type_check;
--   alter table notifications add constraint notifications_type_check
--     check (type in ('new_contribution', 'new_comment', 'new_post'));

-- ─── NOTIFICATION FAN-OUT TRIGGER ────────────────────────────────────────────
-- Fires when a post is first published (is_draft flips false).
-- Notifies topic creator (new_contribution) + topic/subject/author subscribers (new_post).
create or replace function public.notify_new_post()
returns trigger language plpgsql security definer as $$
declare
  v_subject_id uuid;
begin
  if not (
    (TG_OP = 'INSERT' and NEW.is_draft = false) or
    (TG_OP = 'UPDATE' and OLD.is_draft = true and NEW.is_draft = false)
  ) then
    return NEW;
  end if;

  select subject_id into v_subject_id from topics where id = NEW.topic_id;

  -- Notify the topic creator (new_contribution)
  insert into notifications (user_id, actor_id, type, post_id, topic_id)
  select t.created_by, NEW.author_id, 'new_contribution', NEW.id, NEW.topic_id
  from topics t
  where t.id = NEW.topic_id and t.created_by != NEW.author_id
  on conflict do nothing;

  -- Notify all other subscribers (topic + subject + author followers), deduplicated
  insert into notifications (user_id, actor_id, type, post_id, topic_id)
  select distinct target_id, NEW.author_id, 'new_post', NEW.id, NEW.topic_id
  from (
    select user_id as target_id from subscriptions
      where type = 'topic' and entity_id = NEW.topic_id
    union
    select user_id from subscriptions
      where type = 'subject' and entity_id = v_subject_id::text
    union
    select follower_id from follows
      where following_id = NEW.author_id
  ) targets
  where target_id != NEW.author_id
  on conflict do nothing;

  return NEW;
end;
$$;

create trigger on_post_published
  after insert or update on posts
  for each row execute procedure public.notify_new_post();

-- ─── AI USAGE QUOTA ──────────────────────────────────────────────────────────
create table ai_usage (
  user_id uuid not null references profiles(id) on delete cascade,
  date    date not null default current_date,
  calls   integer not null default 0,
  primary key (user_id, date)
);

-- Atomic check-and-increment: returns true if the call is allowed, false if over limit.
-- security definer so it can bypass RLS and update the row unconditionally.
create or replace function public.check_and_increment_ai_usage(p_user_id uuid, p_limit int default 20)
returns boolean
language plpgsql security definer as $$
declare v_calls int;
begin
  insert into ai_usage (user_id, date, calls)
  values (p_user_id, current_date, 0)
  on conflict (user_id, date) do nothing;

  select calls into v_calls from ai_usage where user_id = p_user_id and date = current_date;
  if v_calls >= p_limit then return false; end if;

  update ai_usage set calls = calls + 1 where user_id = p_user_id and date = current_date;
  return true;
end;
$$;
