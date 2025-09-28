#!/bin/bash

# StreamFlix Setup Script
# This script sets up the development environment for the streaming platform

set -e

echo "🎬 StreamFlix - Setting up your Netflix-like streaming platform..."
echo "=================================================================="

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
echo "🎉 StreamFlix setup completed successfully!"
echo "=================================================================="
echo ""
echo "🌐 Access your streaming platform:"
echo "   Frontend:  https://localhost (or http://localhost:3000)"
echo "   Backend:   http://localhost:3001"
echo "   GraphQL:   http://localhost:3001/graphql"
echo "   Admin:     https://localhost/admin"
echo ""
echo "📊 Development Tools:"
echo "   MinIO:     http://localhost:9001 (minioadmin/minioadmin123)"
echo "   Database:  localhost:5432 (postgres/password123)"
echo "   Redis:     localhost:6379"
echo "   Elasticsearch: http://localhost:9200"
echo ""
echo "📚 Next Steps:"
echo "   1. Visit https://localhost to see your streaming platform"
echo "   2. Create an admin account to access the admin dashboard"
echo "   3. Upload some video content to test the platform"
echo "   4. Configure payment gateways for subscriptions"
echo ""
echo "🔧 Development Commands:"
echo "   npm run dev          - Start development server"
echo "   npm run backend:dev  - Start backend in development mode"
echo "   docker-compose logs  - View application logs"
echo "   docker-compose down  - Stop all services"
echo ""
echo "📖 For more information, check the README.md file"
echo ""
echo "Happy streaming! 🍿"
