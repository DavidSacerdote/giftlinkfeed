# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
yarn start              # Run server with ts-node (dev mode)

# Build
yarn build              # Compile TypeScript to dist/

# Tests (must build first — tests run against compiled JS)
yarn test               # Run all tests
yarn test:gift-link     # Run gift-link detection tests only
yarn test:batching      # Run batching queue tests only

# Feed management
yarn publishFeed        # Publish feed to the Bluesky network
yarn unpublishFeed      # Unpublish feed
```

Tests use Node.js's built-in `node:test` module (not Jest/Vitest). Always run `yarn build` before `yarn test`.

## Architecture

This is a Bluesky ATProto feed generator that indexes posts containing paywall gift-sharing links.

### Data flow

```
Bluesky Firehose (wss://bsky.network)
  → subscription.ts         batches up to 100 posts (or 1000ms timeout)
  → Worker thread pool      subscription-worker.ts matches posts against gift-link regex
  → SQLite DB               stores matching post URIs
  → getFeedSkeleton XRPC    serves paginated feed to clients
```

### Key files

- **`src/gift-link.ts`** — Core business logic. Contains a large regex matching 200+ news/paywalled outlets, URL extraction from post text and embed links, and async HTTP redirect resolution (for shorteners like nyti.ms, t.co). This is the file most likely to need updates when adding new publishers.
- **`src/subscription.ts`** — Firehose subscriber. Batches incoming posts via `batching-queue.ts` and dispatches to worker threads to avoid blocking the event loop.
- **`src/subscription-worker.ts`** — Worker thread that runs gift-link matching. Receives batches of posts, filters them, and returns matched URIs.
- **`src/batching-queue.ts`** — Generic queue that flushes at 100 items or 1000ms, whichever comes first.
- **`src/db/`** — SQLite + Kysely ORM. Schema has two tables: `post` (indexed gift-link posts) and `sub_state` (firehose cursor for resume).
- **`src/methods/feed-generation.ts`** — XRPC handler for `app.bsky.feed.getFeedSkeleton`. Returns cursor-paginated post URIs from the database.
- **`src/server.ts`** — Wires together Express, the XRPC server, DID resolver, database, and firehose subscription.
- **`src/lexicon/`** — Auto-generated ATProto lexicon types. Do not edit manually.

### Configuration

Copy `.env.example` to `.env`. Key variables:

| Variable | Purpose |
|----------|---------|
| `FEEDGEN_HOSTNAME` | Public hostname used for `did:web` |
| `FEEDGEN_PUBLISHER_DID` | Bluesky account DID that owns the feed |
| `FEEDGEN_SQLITE_LOCATION` | Path to SQLite file (`:memory:` for ephemeral) |
| `FEEDGEN_SUBSCRIPTION_ENDPOINT` | Firehose WebSocket URL |

### Adding a new gift-link pattern

Edit the regex in `src/gift-link.ts`. Add the outlet's hostname pattern to the existing alternation. If the outlet uses a URL shortener, add it to the shortener list and ensure redirect resolution handles it. Add a test case in `src/gift-link.test.ts` with a real example URL, then run `yarn test:gift-link`.
