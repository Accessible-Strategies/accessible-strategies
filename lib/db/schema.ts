import { pgTable, serial, text, timestamp, varchar, boolean, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// A single composed post — one row regardless of how many platforms it targets
export const posts = pgTable('posts', {
  id:           serial('id').primaryKey(),
  content:      text('content').notNull(),
  scheduledAt:  timestamp('scheduled_at', { withTimezone: true }),
  status:       varchar('status', { length: 20 }).notNull().default('draft'), // draft | scheduled | posted | failed
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// One row per platform per post — tracks independent success/failure
export const postTargets = pgTable('post_targets', {
  id:            serial('id').primaryKey(),
  postId:        integer('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  platform:      varchar('platform', { length: 20 }).notNull(), // bluesky | mastodon
  status:        varchar('status', { length: 20 }).notNull().default('pending'), // pending | posted | failed
  platformPostId: text('platform_post_id'), // the live post's ID on that platform, once published
  postedAt:      timestamp('posted_at', { withTimezone: true }),
  errorMessage:  text('error_message'), // populated if status is 'failed'
});

// Recurring posting time slots — e.g. "Monday 9:00 AM America/Chicago"
// platform is nullable: null = applies to any platform, a specific
// value = only that platform. Lets a shared default rhythm coexist
// with per-platform overrides (e.g. Bluesky Mondays, Mastodon Thursdays).
export const postingSchedule = pgTable('posting_schedule', {
  id:         serial('id').primaryKey(),
  dayOfWeek:  integer('day_of_week').notNull(), // 0 = Sunday ... 6 = Saturday
  time:       varchar('time', { length: 5 }).notNull(), // "09:00" 24hr format
  timezone:   varchar('timezone', { length: 50 }).notNull().default('America/Chicago'),
  platform:   varchar('platform', { length: 20 }), // null = any platform
  active:      boolean('active').notNull().default(true),
});

// CMS pages — dynamic, database-driven content (distinct from the
// hand-coded static Phase 1 pages like /about, /services)
export const pages = pgTable('pages', {
  id:               serial('id').primaryKey(),
  slug:             varchar('slug', { length: 200 }).notNull().unique(),
  title:            text('title').notNull(),
  body:             text('body').notNull().default(''), // HTML from RTE
  heroImageUrl:     text('hero_image_url'),
  heroImageAlt:     text('hero_image_alt'),
  metaDescription:  text('meta_description'),
  status:           varchar('status', { length: 20 }).notNull().default('draft'), // draft | published
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:        timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Site-wide editable content — singleton table, one row.
// Currently just 404 page text; a natural place to grow other
// admin-editable site copy later without a schema change per field.
export const siteSettings = pgTable('site_settings', {
  id:              serial('id').primaryKey(),
  notFoundTitle:   text('not_found_title').notNull().default('Page not found'),
  notFoundMessage: text('not_found_message').notNull().default(
    'The page you’re looking for doesn’t exist, or may have moved.'
  ),
  updatedAt:       timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Local cache of platform notifications (mentions, replies, likes, follows,
// etc.), unified across platforms. Platforms don't share read/unread state
// with us directly — we track that ourselves here, keyed by a unique
// (platform, externalId) pair to avoid duplicate inserts on repeated syncs.
export const notifications = pgTable('notifications', {
  id:                serial('id').primaryKey(),
  platform:          varchar('platform', { length: 20 }).notNull(),
  externalId:        text('external_id').notNull(),
  type:              varchar('type', { length: 30 }).notNull(),
  authorHandle:      text('author_handle'),
  authorDisplayName: text('author_display_name'),
  content:           text('content'), // plain text only — never HTML, see connector notes
  url:               text('url'),
  read:              boolean('read').notNull().default(false),
  createdAt:         timestamp('created_at', { withTimezone: true }).notNull(),
  fetchedAt:         timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
});

// Posts saved from a platform feed for later reference — admin-side only,
// not synced to the platform's own bookmark feature (Bluesky's bookmark
// API isn't in the current SDK version). Same (platform, externalId)
// dedup convention as `notifications`: enforced at the app level in the
// save action, not as a DB constraint.
export const savedPosts = pgTable('saved_posts', {
  id:                serial('id').primaryKey(),
  platform:          varchar('platform', { length: 20 }).notNull(), // bluesky | mastodon
  externalId:        text('external_id').notNull(),
  authorHandle:      text('author_handle'),
  authorDisplayName: text('author_display_name'),
  content:           text('content'),
  url:               text('url'),
  savedAt:           timestamp('saved_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Relations ────────────────────────────────────────────────────────────
// Required for Drizzle's relational query API (db.query.posts.findMany({ with: {...} }))
// — plain foreign keys alone aren't enough for `with` to work.

export const postsRelations = relations(posts, ({ many }) => ({
  targets: many(postTargets),
}));

export const postTargetsRelations = relations(postTargets, ({ one }) => ({
  post: one(posts, {
    fields: [postTargets.postId],
    references: [posts.id],
  }),
}));