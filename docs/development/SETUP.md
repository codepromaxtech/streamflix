# Development Setup Guide

This guide will help you set up the development environment for the streaming platform.

## Prerequisites

- Node.js 18+
- npm 9+
- Docker 20.10+
- Docker Compose 2.0+

## Local Development

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/streaming-platform.git
cd streaming-platform
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit the `.env` file with your local configuration.

### 3. Start Dependencies

Start all required services using Docker Compose:

```bash
docker-compose up -d postgres redis elasticsearch
```

### 4. Set Up Backend

```bash
cd backend
npm install
npx prisma migrate dev
npm run start:dev
```

### 5. Set Up Frontend

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

## Database Management

### Run Migrations

```bash
cd backend
npx prisma migrate dev --name your_migration_name
```

### Generate Prisma Client

```bash
npx prisma generate
```

### Open Prisma Studio

```bash
npx prisma studio
```

## Testing

### Run Unit Tests

```bash
# In the backend directory
npm test

# In the frontend directory
npm test
```

### Run E2E Tests

```bash
# In the backend directory
npm run test:e2e
```

## Debugging

### Backend Debugging

Use VS Code's debugger with the following launch configuration:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "start:debug"],
      "port": 9229,
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

## Code Style

- Use Prettier for code formatting
- Follow ESLint rules
- Write meaningful commit messages using [Conventional Commits](https://www.conventionalcommits.org/)

## Git Workflow

1. Create a new branch for your feature
2. Make your changes
3. Run tests
4. Commit your changes
5. Push your branch
6. Create a pull request
