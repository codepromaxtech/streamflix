# 🚀 StreamFlix Deployment Guide

This guide covers deploying the StreamFlix streaming platform to production environments using Docker, Kubernetes, and cloud services.

## 📋 Prerequisites

### System Requirements
- **CPU**: 4+ cores (8+ recommended for production)
- **RAM**: 8GB minimum (16GB+ recommended)
- **Storage**: 100GB+ SSD for database and cache
- **Network**: High bandwidth for video streaming

### Software Requirements
- Docker 20.10+
- Docker Compose 2.0+
- Kubernetes 1.24+ (for K8s deployment)
- kubectl configured
- Node.js 18+ (for local development)

### External Services
- **Database**: PostgreSQL 15+ (managed service recommended)
- **Cache**: Redis 7+ (managed service recommended)
- **Search**: Elasticsearch 8+ (managed service recommended)
- **Storage**: AWS S3 or compatible object storage
- **CDN**: CloudFlare, AWS CloudFront, or similar

## 🐳 Docker Deployment

### Quick Start (Development)
```bash
# Clone the repository
git clone <repository-url>
cd streaming-platform

# Make setup script executable
chmod +x scripts/setup.sh

# Run setup script
./scripts/setup.sh
```

### Production Deployment
```bash
# Set environment variables
export NODE_ENV=production
export DATABASE_URL="postgresql://user:pass@host:5432/db"
export JWT_SECRET="your-secure-jwt-secret"
export STRIPE_SECRET_KEY="sk_live_your_stripe_key"

# Deploy with production compose file
docker-compose -f docker-compose.prod.yml up -d

# Run database migrations
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Check service health
docker-compose -f docker-compose.prod.yml ps
```

## ☸️ Kubernetes Deployment

### 1. Prepare Cluster
```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Apply configuration and secrets
kubectl apply -f k8s/configmap.yaml
```

### 2. Deploy Database Layer
```bash
# Deploy PostgreSQL
kubectl apply -f k8s/postgres.yaml

# Deploy Redis
kubectl apply -f k8s/redis.yaml

# Deploy Elasticsearch
kubectl apply -f k8s/elasticsearch.yaml

# Wait for databases to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n streamflix --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n streamflix --timeout=300s
```

### 3. Deploy Application Layer
```bash
# Deploy backend
kubectl apply -f k8s/backend.yaml

# Deploy frontend
kubectl apply -f k8s/frontend.yaml

# Deploy video processor
kubectl apply -f k8s/video-processor.yaml

# Wait for applications to be ready
kubectl wait --for=condition=ready pod -l app=backend -n streamflix --timeout=300s
kubectl wait --for=condition=ready pod -l app=frontend -n streamflix --timeout=300s
```

### 4. Configure Ingress
```bash
# Install NGINX Ingress Controller (if not already installed)
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml

# Install cert-manager for SSL certificates
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Apply ingress configuration
kubectl apply -f k8s/ingress.yaml
```

### 5. Run Database Migrations
```bash
# Get backend pod name
BACKEND_POD=$(kubectl get pods -n streamflix -l app=backend -o jsonpath='{.items[0].metadata.name}')

# Run migrations
kubectl exec -n streamflix $BACKEND_POD -- npx prisma migrate deploy

# Seed database (optional)
kubectl exec -n streamflix $BACKEND_POD -- npm run db:seed
```

## ☁️ Cloud Provider Deployment

### AWS EKS
```bash
# Create EKS cluster
eksctl create cluster --name streamflix-cluster --region us-west-2 --nodes 3 --node-type m5.large

# Configure kubectl
aws eks update-kubeconfig --region us-west-2 --name streamflix-cluster

# Deploy application
kubectl apply -f k8s/
```

### Google GKE
```bash
# Create GKE cluster
gcloud container clusters create streamflix-cluster \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type n1-standard-2

# Get credentials
gcloud container clusters get-credentials streamflix-cluster --zone us-central1-a

# Deploy application
kubectl apply -f k8s/
```

### Azure AKS
```bash
# Create AKS cluster
az aks create \
  --resource-group streamflix-rg \
  --name streamflix-cluster \
  --node-count 3 \
  --node-vm-size Standard_D2s_v3

# Get credentials
az aks get-credentials --resource-group streamflix-rg --name streamflix-cluster

# Deploy application
kubectl apply -f k8s/
```

## 🔧 Configuration

### Environment Variables

#### Required Variables
```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/streaming_platform"
REDIS_URL="redis://host:6379"
ELASTICSEARCH_URL="http://host:9200"

# Security
JWT_SECRET="your-super-secure-jwt-secret-min-32-chars"
ENCRYPTION_KEY="your-32-character-encryption-key"

# Payment Gateways
STRIPE_SECRET_KEY="sk_live_your_stripe_secret_key"
SSLCOMMERZ_STORE_ID="your_store_id"
SSLCOMMERZ_STORE_PASSWORD="your_store_password"
PAYPAL_CLIENT_SECRET="your_paypal_secret"

# Storage
AWS_ACCESS_KEY_ID="your_aws_access_key"
AWS_SECRET_ACCESS_KEY="your_aws_secret_key"
AWS_S3_BUCKET="your-video-bucket"
```

#### Optional Variables
```bash
# External APIs
TMDB_API_KEY="your_tmdb_api_key"
OMDB_API_KEY="your_omdb_api_key"

# Monitoring
SENTRY_DSN="your_sentry_dsn"
GOOGLE_ANALYTICS_ID="GA-XXXXXXXXX"

# Email
SMTP_HOST="smtp.gmail.com"
SMTP_USER="your_email@gmail.com"
SMTP_PASS="your_app_password"
```

### SSL/TLS Configuration

#### Let's Encrypt (Recommended)
```yaml
# cert-manager ClusterIssuer
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@yourdomain.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
```

#### Custom SSL Certificates
```bash
# Create TLS secret
kubectl create secret tls streamflix-tls \
  --cert=path/to/cert.pem \
  --key=path/to/key.pem \
  -n streamflix
```

## 📊 Monitoring & Logging

### Prometheus & Grafana
```bash
# Install Prometheus Operator
kubectl apply -f https://raw.githubusercontent.com/prometheus-operator/prometheus-operator/main/bundle.yaml

# Deploy monitoring stack
kubectl apply -f k8s/monitoring/
```

### Log Aggregation
```bash
# Install ELK Stack
kubectl apply -f k8s/logging/elasticsearch.yaml
kubectl apply -f k8s/logging/logstash.yaml
kubectl apply -f k8s/logging/kibana.yaml
```

## 🔄 CI/CD Pipeline

### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Build and Deploy
      run: |
        docker build -t streamflix/frontend:${{ github.sha }} .
        docker build -t streamflix/backend:${{ github.sha }} ./backend
        # Push to registry and deploy
```

### GitLab CI
```yaml
# .gitlab-ci.yml
stages:
  - build
  - deploy

build:
  stage: build
  script:
    - docker build -t $CI_REGISTRY_IMAGE/frontend:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE/frontend:$CI_COMMIT_SHA

deploy:
  stage: deploy
  script:
    - kubectl set image deployment/frontend frontend=$CI_REGISTRY_IMAGE/frontend:$CI_COMMIT_SHA -n streamflix
```

## 🚀 Performance Optimization

### Database Optimization
```sql
-- Create indexes for better performance
CREATE INDEX CONCURRENTLY idx_content_published ON content(is_published) WHERE is_published = true;
CREATE INDEX CONCURRENTLY idx_content_type_genre ON content(type, genre);
CREATE INDEX CONCURRENTLY idx_watch_history_user ON watch_history(user_id, watched_at DESC);
```

### Redis Configuration
```bash
# Optimize Redis for caching
redis-cli CONFIG SET maxmemory-policy allkeys-lru
redis-cli CONFIG SET maxmemory 2gb
redis-cli CONFIG SET save "900 1 300 10 60 10000"
```

### CDN Configuration
```javascript
// CloudFlare Workers for video optimization
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  
  // Optimize video delivery based on device
  if (url.pathname.includes('/videos/')) {
    const userAgent = request.headers.get('User-Agent')
    const isMobile = /Mobile|Android|iPhone/i.test(userAgent)
    
    // Serve appropriate quality for mobile devices
    if (isMobile && !url.searchParams.has('quality')) {
      url.searchParams.set('quality', '720p')
    }
  }
  
  return fetch(url.toString(), request)
}
```

## 🔍 Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check database connectivity
kubectl exec -n streamflix deployment/backend -- pg_isready -h postgres-service -p 5432

# View database logs
kubectl logs -n streamflix deployment/postgres -f
```

#### Video Streaming Issues
```bash
# Check video processor logs
kubectl logs -n streamflix deployment/video-processor -f

# Verify storage connectivity
kubectl exec -n streamflix deployment/backend -- aws s3 ls s3://your-bucket/
```

#### Performance Issues
```bash
# Check resource usage
kubectl top pods -n streamflix
kubectl top nodes

# Scale deployments
kubectl scale deployment frontend --replicas=5 -n streamflix
kubectl scale deployment backend --replicas=3 -n streamflix
```

### Health Checks
```bash
# Check all services
kubectl get pods -n streamflix
kubectl get services -n streamflix
kubectl get ingress -n streamflix

# Test endpoints
curl -f https://your-domain.com/api/health
curl -f https://your-domain.com/health
```

## 📈 Scaling

### Horizontal Pod Autoscaler
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: frontend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: frontend
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Vertical Pod Autoscaler
```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: backend-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  updatePolicy:
    updateMode: "Auto"
```

## 🔒 Security

### Network Policies
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: streamflix-network-policy
  namespace: streamflix
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
  egress:
  - to: []
    ports:
    - protocol: TCP
      port: 53
    - protocol: UDP
      port: 53
```

### Pod Security Standards
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: streamflix
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

## 📚 Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [cert-manager Documentation](https://cert-manager.io/docs/)
- [Prometheus Operator](https://prometheus-operator.dev/)

## 🆘 Support

For deployment issues and questions:
- Check the [troubleshooting section](#-troubleshooting)
- Review application logs
- Open an issue in the repository
- Contact the development team

---

**Happy Streaming! 🍿**
