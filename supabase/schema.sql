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
-- Edges in the mind map graph — links between related topics
create table topic_relations (
  from_id uuid references topics(id) on delete cascade,
  to_id   uuid references topics(id) on delete cascade,
  primary key (from_id, to_id)
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

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────────────────
alter table profiles enable row level security;
alter table topics enable row level security;
alter table posts enable row level security;
alter table collections enable row level security;
alter table collection_posts enable row level security;
alter table topic_relations enable row level security;
alter table follows enable row level security;
alter table comments enable row level security;

-- Profiles: public read, owner write
create policy "Public profiles are viewable by everyone" on profiles for select using (true);
create policy "Users can insert their own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users can update their own profile" on profiles for update using (auth.uid() = id);

-- Topics: public read, authenticated create — creator must match auth.uid()
create policy "Topics are viewable by everyone" on topics for select using (true);
create policy "Authenticated users can create topics" on topics for insert with check (auth.uid() = created_by);

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

-- Topic relations: public read, authenticated create
create policy "Topic relations are viewable by everyone" on topic_relations for select using (true);
create policy "Authenticated users can create relations" on topic_relations for insert with check (auth.role() = 'authenticated');

-- Follows: public read, owner write
create policy "Follows are viewable by everyone" on follows for select using (true);
create policy "Users can follow others" on follows for insert with check (auth.uid() = follower_id);
create policy "Users can unfollow" on follows for delete using (auth.uid() = follower_id);

-- Comments: public read, authenticated write — author must match auth.uid()
create policy "Comments are viewable by everyone" on comments for select using (true);
create policy "Authenticated users can comment" on comments for insert with check (auth.uid() = author_id);
create policy "Authors can delete their own comments" on comments for delete using (auth.uid() = author_id);

-- ─── AUTO-CREATE PROFILE ON SIGNUP ──────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
