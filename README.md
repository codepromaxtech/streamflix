# Streaming Platform

A modern, scalable streaming platform built with Next.js, NestJS, and Docker.

## Project Structure

```
.
├── backend/              # Backend service (NestJS)
├── frontend/             # Frontend service (Next.js)
├── video-processor/      # Video processing service
├── docs/                 # Documentation
│   ├── api/              # API documentation
│   ├── architecture/     # Architecture decisions and diagrams
│   ├── deployment/       # Deployment guides
│   ├── development/      # Development setup guides
│   └── security/         # Security policies and audit reports
└── docker-compose.yml    # Docker Compose configuration
```

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+
- npm 9+

## Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/streaming-platform.git
   cd streaming-platform
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the application**
   ```bash
   docker-compose up --build
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000/graphql
   - PostgreSQL: localhost:5432
   - Redis: localhost:6379
   - Elasticsearch: http://localhost:9200

## Development

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
npm install
npm run start:dev
```

## Documentation

- [Architecture](/docs/architecture/)
- [API Reference](/docs/api/)
- [Deployment Guide](/docs/deployment/)
- [Development Setup](/docs/development/)
- [Security](/docs/security/)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
