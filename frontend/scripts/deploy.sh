#!/bin/bash

# StreamFlix Production Deployment Script
# This script deploys the streaming platform to production

set -e

echo "🚀 StreamFlix - Production Deployment"
echo "====================================="

# Check if environment is set
if [ -z "$NODE_ENV" ]; then
    export NODE_ENV=production
fi

echo "🌍 Environment: $NODE_ENV"

# Check if required environment variables are set
REQUIRED_VARS=(
    "DATABASE_URL"
    "JWT_SECRET"
    "STRIPE_SECRET_KEY"
    "AWS_ACCESS_KEY_ID"
    "AWS_SECRET_ACCESS_KEY"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Required environment variable $var is not set"
        exit 1
    fi
done

echo "✅ Environment variables validated"

# Build Docker images
echo "🔨 Building Docker images..."
docker build -t streamflix-frontend:latest .
docker build -t streamflix-backend:latest ./backend

# Tag images for registry (replace with your registry)
REGISTRY=${DOCKER_REGISTRY:-"your-registry.com"}
docker tag streamflix-frontend:latest $REGISTRY/streamflix-frontend:latest
docker tag streamflix-backend:latest $REGISTRY/streamflix-backend:latest

# Push images to registry
echo "📤 Pushing images to registry..."
docker push $REGISTRY/streamflix-frontend:latest
docker push $REGISTRY/streamflix-backend:latest

# Deploy with Docker Compose (Production)
echo "🚀 Deploying to production..."
docker-compose -f docker-compose.prod.yml up -d

# Run database migrations
echo "🗄️  Running production database migrations..."
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Health check
echo "🏥 Performing health checks..."
sleep 30

# Check frontend
if curl -f -s https://localhost/health > /dev/null; then
    echo "✅ Frontend is healthy"
else
    echo "❌ Frontend health check failed"
    exit 1
fi

# Check backend
if curl -f -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed"
    exit 1
fi

echo ""
echo "🎉 Deployment completed successfully!"
echo "====================================="
echo ""
echo "🌐 Your streaming platform is live at:"
echo "   Production URL: https://your-domain.com"
echo "   Admin Panel:    https://your-domain.com/admin"
echo ""
echo "📊 Monitoring:"
echo "   - Check application logs: docker-compose -f docker-compose.prod.yml logs"
echo "   - Monitor resource usage: docker stats"
echo "   - Database status: docker-compose -f docker-compose.prod.yml exec postgres pg_isready"
echo ""
echo "🔧 Post-deployment tasks:"
echo "   1. Configure CDN for video delivery"
echo "   2. Set up SSL certificates with Let's Encrypt"
echo "   3. Configure monitoring and alerting"
echo "   4. Set up backup procedures"
echo "   5. Test payment gateways in production"
echo ""
echo "Happy streaming! 🍿"
