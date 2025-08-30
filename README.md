# Hong97 Ltd Next

A modern full-stack web application featuring a personal portfolio with blog functionality, built using Next.js and NestJS in a monorepo architecture.

## Overview

This project consists of two main packages:
- **Frontend**: Next.js 13 application with MDX blog support
- **Backend**: NestJS API server with MongoDB and authentication

## Features

- **MDX Blog System** - Write blog posts in MDX with syntax highlighting
- **Internationalization** - Support for Chinese and English (CN/EN)
- **Authentication** - JWT-based auth with refresh tokens
- **Responsive Design** - Built with Tailwind CSS and Radix UI
- **Modern UI** - Custom components with animations via Framer Motion

## Tech Stack

### Frontend
- **Framework**: Next.js 13 (Pages Router)
- **Styling**: Tailwind CSS + Radix UI
- **State Management**: Zustand
- **Animations**: Framer Motion
- **Content**: MDX with syntax highlighting
- **i18n**: next-i18next

### Backend
- **Framework**: NestJS
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT + bcrypt
- **File Storage**: Ali OSS
- **Validation**: class-validator
- **i18n**: nestjs-i18n

## Quick Start

### Prerequisites
- Node.js 18+
- pnpm
- MongoDB instance

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp packages/server/.env.example packages/server/.env
# Edit the .env file with your configuration
```

### Development

Start both frontend and backend in development mode:

```bash
# Frontend (runs on http://localhost:3000)
pnpm dev:fe

# Backend (runs on http://localhost:3001)
pnpm dev:server

# Backend with debug mode
pnpm dev:server-debug
```

### Production Build

```bash
# Build both packages
pnpm build:fe
pnpm build:server

# Start production servers
pnpm start:fe
pnpm start:server
```
## Configuration

### Environment Variables

Create a `.env` file in `packages/server/` with:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/hong97-ltd-next

# Authentication
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret

# OSS (Alibaba Cloud)
OSS_REGION=your-oss-region
OSS_ACCESS_KEY_ID=your-access-key
OSS_ACCESS_KEY_SECRET=your-access-secret
OSS_BUCKET=your-bucket-name
```
## License

Private project - All rights reserved