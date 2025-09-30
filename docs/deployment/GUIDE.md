# 🚀 StreamFlix - Complete Deployment Guide

## 📋 **Table of Contents**

- [🎯 Overview](#-overview)
- [⚡ Quick Deploy](#-quick-deploy)
- [🐳 Docker Production](#-docker-production)
- [☸️ Kubernetes Deployment](#️-kubernetes-deployment)
- [🔒 Security Setup](#-security-setup)
- [🌐 CDN Configuration](#-cdn-configuration)
- [📊 Monitoring Setup](#-monitoring-setup)
- [🔧 Environment Configuration](#-environment-configuration)
- [📈 Scaling Guidelines](#-scaling-guidelines)
- [🆘 Troubleshooting](#-troubleshooting)

---

## 🎯 **Overview**

StreamFlix is a complete enterprise streaming ecosystem that combines:
- **Netflix-style** long-form video streaming
- **YouTube-style** content management and discovery
- **TikTok-style** short-form vertical videos
- **Twitch-style** live streaming with real-time chat
- **Medium-style** blog and article system
- **Digital store** for virtual goods and subscriptions

This guide covers production deployment for high-availability, scalable environments.

---

## ⚡ **Quick Deploy**

### **One-Command Production Deploy**

```bash
# Clone and deploy to production
git clone https://github.com/your-username/streamflix.git
cd streamflix
chmod +x scripts/deploy.sh
./scripts/deploy.sh production
```

### **Environment Setup**

```bash
# Copy production environment template
cp .env.production.example .env.production

# Update critical production settings
nano .env.production
```

**Required Production Variables:**
```env
# Database (Use managed service in production)
DATABASE_URL="postgresql://user:pass@your-db-host:5432/streamflix_prod"
REDIS_URL="redis://your-redis-host:6379"
ELASTICSEARCH_URL="https://your-elasticsearch-host:9200"

# Security
JWT_SECRET="your-super-secure-jwt-secret-64-chars-minimum"
ENCRYPTION_KEY="your-32-char-encryption-key"

# CDN & Storage
AWS_ACCESS_KEY_ID="your-aws-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret"
AWS_S3_BUCKET="your-video-bucket"
CDN_URL="https://cdn.yourdomain.com"

# Payment Gateways
STRIPE_SECRET_KEY="sk_live_your-stripe-key"
SSLCOMMERZ_STORE_ID="your-store-id"
PAYPAL_CLIENT_SECRET="your-paypal-secret"

# Email Service
SENDGRID_API_KEY="your-sendgrid-key"
EMAIL_FROM="noreply@yourdomain.com"

# Domain Configuration
FRONTEND_URL="https://yourdomain.com"
BACKEND_URL="https://api.yourdomain.com"
```

---

## 🐳 **Docker Production**

### **Production Docker Compose**

```bash
# Build and start production containers
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

### **Production Dockerfile Optimizations**

The production Dockerfiles include:
- Multi-stage builds for minimal image size
- Security hardening with non-root users
- Health checks and graceful shutdowns
- Optimized layer caching
- Vulnerability scanning integration

### **Container Health Monitoring**

```bash
# Check container health
docker-compose -f docker-compose.prod.yml ps

# Monitor resource usage
docker stats

# View detailed container info
docker inspect streamflix_backend_1
```

---

## ☸️ **Kubernetes Deployment**

### **Deploy to Kubernetes**

```bash
# Apply all Kubernetes manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n streamflix
kubectl get services -n streamflix
kubectl get ingress -n streamflix

# View logs
kubectl logs -f deployment/streamflix-backend -n streamflix
```

### **Kubernetes Features**

- **Auto-scaling**: HPA and VPA configured
- **Rolling updates**: Zero-downtime deployments
- **Health checks**: Liveness and readiness probes
- **Resource limits**: CPU and memory constraints
- **Security policies**: Pod security standards
- **Secrets management**: Encrypted configuration
- **Persistent storage**: StatefulSets for databases

### **Scaling Configuration**

```yaml
# Auto-scaling example
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: streamflix-backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: streamflix-backend
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

---

## 🔒 **Security Setup**

### **SSL/TLS Configuration**

```bash
# Install Certbot for Let's Encrypt
sudo apt install certbot python3-certbot-nginx

# Generate SSL certificates
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com

# Auto-renewal cron job
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

### **Security Headers (Nginx)**

```nginx
# /etc/nginx/sites-available/streamflix
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;
    
    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### **Firewall Configuration**

```bash
# UFW Firewall setup
sudo ufw enable
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 1935/tcp  # RTMP (for live streaming)

# Fail2ban for intrusion prevention
sudo apt install fail2ban
sudo systemctl enable fail2ban
```

---

## 🌐 **CDN Configuration**

### **Cloudflare Setup**

1. **DNS Configuration**:
   ```
   A    yourdomain.com        -> your-server-ip
   A    api.yourdomain.com    -> your-server-ip
   A    cdn.yourdomain.com    -> your-server-ip
   CNAME www                  -> yourdomain.com
   ```

2. **Cloudflare Settings**:
   - SSL/TLS: Full (strict)
   - Always Use HTTPS: On
   - Automatic HTTPS Rewrites: On
   - Brotli Compression: On
   - Minification: CSS, HTML, JS

### **AWS CloudFront Setup**

```bash
# Create CloudFront distribution
aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json

# Invalidate cache after updates
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

---

## 📊 **Monitoring Setup**

### **Prometheus + Grafana**

```bash
# Deploy monitoring stack
kubectl apply -f k8s/monitoring/

# Access Grafana dashboard
kubectl port-forward svc/grafana 3000:3000 -n monitoring
# Visit http://localhost:3000 (admin/admin)
```

### **Application Monitoring**

```bash
# Install monitoring agents
npm install @prometheus-prom/client
npm install winston elasticsearch

# Health check endpoints
curl https://api.yourdomain.com/health
curl https://api.yourdomain.com/metrics
```

### **Log Aggregation (ELK Stack)**

```yaml
# Elasticsearch, Logstash, Kibana configuration
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms1g -Xmx1g"
    
  logstash:
    image: docker.elastic.co/logstash/logstash:8.11.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    
  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    ports:
      - "5601:5601"
```

---

## 🔧 **Environment Configuration**

### **Production Environment Variables**

```env
# Application
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com

# Database Configuration
DATABASE_URL=postgresql://user:pass@db-host:5432/streamflix
DATABASE_POOL_SIZE=20
DATABASE_SSL=true

# Redis Configuration
REDIS_URL=redis://redis-host:6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0

# Elasticsearch
ELASTICSEARCH_URL=https://elastic-host:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=your-elastic-password

# File Storage
AWS_REGION=us-east-1
AWS_S3_BUCKET=streamflix-videos
AWS_CLOUDFRONT_DOMAIN=cdn.yourdomain.com

# Video Processing
FFMPEG_PATH=/usr/bin/ffmpeg
VIDEO_PROCESSING_CONCURRENCY=4
ENABLE_GPU_ACCELERATION=true

# Security
JWT_SECRET=your-64-char-jwt-secret
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Payment Gateways
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
SSLCOMMERZ_STORE_ID=your-store-id
SSLCOMMERZ_STORE_PASSWORD=your-password
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-secret

# Email Configuration
SENDGRID_API_KEY=SG.your-sendgrid-key
EMAIL_FROM=noreply@yourdomain.com
SUPPORT_EMAIL=support@yourdomain.com

# Monitoring
SENTRY_DSN=https://your-sentry-dsn
NEW_RELIC_LICENSE_KEY=your-newrelic-key
PROMETHEUS_ENABLED=true

# Feature Flags
ENABLE_LIVE_STREAMING=true
ENABLE_SHORT_VIDEOS=true
ENABLE_BLOG_SYSTEM=true
ENABLE_DIGITAL_STORE=true
ENABLE_AI_MODERATION=true
```

---

## 📈 **Scaling Guidelines**

### **Horizontal Scaling**

```bash
# Scale backend services
kubectl scale deployment streamflix-backend --replicas=5

# Scale database (read replicas)
kubectl apply -f k8s/database/read-replicas.yaml

# Scale Redis cluster
kubectl apply -f k8s/redis/cluster.yaml
```

### **Vertical Scaling**

```yaml
# Resource limits for production
resources:
  requests:
    memory: "1Gi"
    cpu: "500m"
  limits:
    memory: "2Gi"
    cpu: "1000m"
```

### **Database Optimization**

```sql
-- PostgreSQL optimization for production
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;

-- Reload configuration
SELECT pg_reload_conf();
```

---

## 🆘 **Troubleshooting**

### **Common Issues**

1. **Database Connection Issues**:
   ```bash
   # Check database connectivity
   kubectl exec -it pod/streamflix-backend-xxx -- nc -zv postgres-host 5432
   
   # Check connection pool
   kubectl logs deployment/streamflix-backend | grep "database"
   ```

2. **Video Processing Failures**:
   ```bash
   # Check FFmpeg installation
   kubectl exec -it pod/streamflix-backend-xxx -- ffmpeg -version
   
   # Monitor processing queue
   kubectl exec -it pod/redis-xxx -- redis-cli monitor
   ```

3. **High Memory Usage**:
   ```bash
   # Monitor memory usage
   kubectl top pods -n streamflix
   
   # Check for memory leaks
   kubectl exec -it pod/streamflix-backend-xxx -- node --inspect
   ```

### **Performance Optimization**

```bash
# Enable gzip compression
gzip on;
gzip_types text/plain text/css application/json application/javascript;

# Enable HTTP/2
listen 443 ssl http2;

# Optimize database queries
EXPLAIN ANALYZE SELECT * FROM content WHERE category = 'movies';

# Monitor slow queries
log_min_duration_statement = 1000;
```

### **Backup and Recovery**

```bash
# Database backup
pg_dump -h db-host -U username -d streamflix > backup.sql

# Redis backup
redis-cli --rdb backup.rdb

# File storage backup (AWS S3)
aws s3 sync s3://streamflix-videos s3://streamflix-backup
```

---

## 🎯 **Production Checklist**

### **Pre-Deployment**

- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Database migrations applied
- [ ] CDN configured and tested
- [ ] Payment gateways tested
- [ ] Email service configured
- [ ] Monitoring and logging setup
- [ ] Backup strategy implemented
- [ ] Security audit completed
- [ ] Load testing performed

### **Post-Deployment**

- [ ] Health checks passing
- [ ] SSL/TLS working correctly
- [ ] Payment processing tested
- [ ] Video upload and streaming working
- [ ] Email notifications working
- [ ] Monitoring alerts configured
- [ ] Performance metrics baseline established
- [ ] Documentation updated
- [ ] Team trained on operations

---

## 📞 **Support**

For deployment assistance:
- 📧 **Email**: devops@streamflix.com
- 💬 **Discord**: [StreamFlix Community](https://discord.gg/streamflix)
- 📖 **Documentation**: [docs.streamflix.com](https://docs.streamflix.com)

---

**🚀 Your StreamFlix platform is now ready for production!** 🎬✨
