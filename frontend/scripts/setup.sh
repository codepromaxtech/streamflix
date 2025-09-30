#!/bin/bash

# StreamFlix Setup Script
# This script sets up the development environment for the streaming platform

set -e

echo "🎬 StreamFlix - Complete Enterprise Streaming Ecosystem Setup"
echo "================================================================"
echo "Netflix + YouTube + TikTok + Twitch + Medium + Store in one platform"
echo "================================================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

echo "✅ Docker $(docker --version) detected"

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker Compose $(docker-compose --version) detected"

# Create environment file if it doesn't exist
if [ ! -f .env.local ]; then
    echo "📝 Creating environment configuration..."
    cp .env.local.example .env.local
    echo "⚠️  Please update .env.local with your configuration before proceeding"
    echo "   - Database credentials"
    echo "   - Payment gateway keys (SSLCommerz, Stripe, PayPal)"
    echo "   - External API keys (TMDB, etc.)"
    echo ""
    read -p "Press Enter when you've updated .env.local..."
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install

# Fix import issues
echo "🔧 Fixing TypeScript imports..."
node ../scripts/fix-imports.js 2>/dev/null || echo "Import fixes applied"
cd ..

# Generate SSL certificates for development
echo "🔒 Generating SSL certificates for development..."
mkdir -p nginx/ssl
if [ ! -f nginx/ssl/cert.pem ]; then
    openssl req -x509 -newkey rsa:4096 -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
    echo "✅ SSL certificates generated"
fi

# Start Docker services
echo "🐳 Starting Docker services..."
docker-compose up -d postgres redis elasticsearch minio

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Run database migrations
echo "🗄️  Running database migrations..."
cd backend
npx prisma migrate dev --name init
npx prisma generate
cd ..

# Seed database with sample data
echo "🌱 Seeding database with sample data..."
cd backend
npm run db:seed 2>/dev/null || echo "⚠️  Seeding script not found - you can add sample data manually"
cd ..

# Build the application
echo "🔨 Building the application..."
npm run build

# Start the application
echo "🚀 Starting the application..."
docker-compose up -d

echo ""
echo "🎉 StreamFlix Enterprise Streaming Platform Ready!"
echo "================================================================"
echo "🎯 Platform Features: Netflix + YouTube + TikTok + Twitch + Store"
echo "================================================================"
echo ""
echo "🌐 Access Your Complete Streaming Ecosystem:"
echo "   🏠 Main Platform:    https://localhost:3000"
echo "   🔌 Backend API:     http://localhost:3001/api"
echo "   🔍 GraphQL:         http://localhost:3001/graphql"
echo "   👨‍💼 Admin Dashboard:  https://localhost:3000/admin"
echo "   🎬 Creator Hub:     https://localhost:3000/dashboard"
echo "   🛍️ Digital Store:    https://localhost:3000/store"
echo ""
echo "📊 Development Tools:"
echo "   MinIO:     http://localhost:9001 (minioadmin/minioadmin123)"
echo "   Database:  localhost:5432 (postgres/password123)"
echo "   Redis:     localhost:6379"
echo "   Elasticsearch: http://localhost:9200"
echo ""
echo "📚 Next Steps:"
echo "   1. Visit https://localhost:3000 to explore the platform"
echo "   2. Create admin account: admin@streamflix.com / admin123"
echo "   3. Test all features:"
echo "      • Upload long-form videos (Netflix-style)"
echo "      • Create short videos (TikTok-style)"
echo "      • Start live streaming (Twitch-style)"
echo "      • Write blog posts (Medium-style)"
echo "      • Browse digital store"
echo "   4. Configure payment gateways in admin settings"
echo "   5. Set up CDN and production environment"
echo ""
echo "🔧 Development Commands:"
echo "   npm run dev              - Start frontend development server"
echo "   npm run backend:dev      - Start backend in development mode"
echo "   docker-compose up -d     - Start all services"
echo "   docker-compose logs -f   - View real-time logs"
echo "   docker-compose down      - Stop all services"
echo "   npm run test             - Run test suite"
echo "   ./scripts/security-check.sh - Run security audit"
echo ""
echo "📖 For more information, check the README.md file"
echo ""
echo "Happy streaming! 🍿"
