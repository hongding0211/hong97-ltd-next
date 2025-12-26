# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Architecture

This is a monorepo with two main packages:
- `packages/fe/`: Next.js 13 frontend application with MDX blog support
- `packages/server/`: NestJS backend API server

The project uses pnpm workspaces for dependency management and includes shared scripts at the root level.

## Development Commands

### Frontend Development
```bash
# Development server
pnpm dev:fe

# Build
pnpm build:fe

# Production start
pnpm start:fe
```

### Backend Development
```bash
# Development server with watch mode
pnpm dev:server

# Development server with debug mode
pnpm dev:server-debug

# Build
pnpm build:server

# Production start
pnpm start:server

# Testing
pnpm --filter hong97-ltd-next-server test
pnpm --filter hong97-ltd-next-server test:watch
pnpm --filter hong97-ltd-next-server test:e2e
```

### Code Quality & Linting
```bash
# Lint entire project with Biome
pnpm lint

# Format and fix linting issues
pnpm check
```

### Utility Scripts
```bash
# Create new blog post
pnpm new:blog

# Login utility
pnpm login

# Version bumping
pnpm bump:fe
pnpm bump:server
```

## Frontend Tech Stack

- **Framework**: Next.js 13 with App Router disabled (uses Pages Router)
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Radix UI primitives with custom components in `src/components/ui/`
- **State Management**: Zustand stores in `stores/`
- **Internationalization**: next-i18next with CN/EN locales
- **Blog System**: MDX with syntax highlighting via rehype-starry-night
- **Authentication**: Custom auth system with JWT tokens
- **Animations**: Framer Motion and custom MagicUI components

Key frontend directories:
- `components/`: React components organized by feature
- `pages/`: Next.js pages (blog, about, projects, tools)
- `services/`: API service layers with type definitions
- `utils/`: Utility functions for client-side operations

## Backend Tech Stack

- **Framework**: NestJS with Express
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with refresh tokens, bcrypt for passwords
- **File Storage**: Ali OSS (Alibaba Object Storage Service)
- **Validation**: class-validator with DTOs
- **Rate Limiting**: Built-in throttling guards
- **i18n**: nestjs-i18n with CN/EN support

Key backend directories:
- `modules/`: Feature modules (auth, blog, oss, ucp, user)
- `guards/`: Authentication and throttling guards
- `decorators/`: Custom parameter decorators
- `config/`: Configuration management with environment-specific settings

## Blog System

The blog uses MDX files stored in `packages/fe/pages/blog/markdowns/`. Each post:
- Has corresponding React component in `components/blog/`
- Supports syntax highlighting and custom components
- Uses meta queries for post retrieval
- Supports comments system via backend API

## Authentication Flow

- Login/register through backend API
- JWT tokens stored in HTTP-only cookies
- Refresh token mechanism for session management
- User profile management with avatar upload to OSS

## Testing

Backend uses Jest with the following test types:
- Unit tests: `*.spec.ts` files
- E2E tests: `test/` directory with `jest-e2e.json` config
- Coverage reports generated in `coverage/` directory

## Code Style

- Uses Biome for linting and formatting
- 2-space indentation, single quotes, trailing commas
- TypeScript strict mode enabled
- Pre-commit hooks via husky and lint-staged
- Organized imports enforced
- Do not add comments unless it's very necessary, also using English for comments.
- Prefer early returns to reduce nesting.
- Prefer iife for complex expressions.