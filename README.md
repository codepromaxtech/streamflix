# 🎬 StreamFlix - Netflix-like Streaming Platform

A comprehensive, production-ready streaming platform built with modern technologies, supporting both free (AVOD) and premium (SVOD) content delivery.

## 🚀 Features

### 🎯 Core Features
- **Video Streaming**: HLS/DASH adaptive bitrate streaming with DRM support
- **User Management**: Authentication, profiles, watch history, favorites
- **Content Management**: Movies, TV series, documentaries with metadata
- **Monetization**: Free tier with ads, Premium subscription without ads
- **Payment Integration**: SSLCommerz, Stripe, and PayPal support
- **Admin Dashboard**: Complete content and user management system
- **Analytics**: User engagement, content performance, revenue tracking

### 🎨 User Experience
- **Responsive Design**: Optimized for mobile, tablet, desktop, and Smart TVs
- **Netflix-like UI**: Modern, intuitive interface with hover previews
- **Advanced Video Player**: Shaka Player with quality selection, subtitles, speed control
- **Search & Discovery**: ElasticSearch-powered content discovery
- **Multi-language Support**: Subtitles and audio tracks in multiple languages

### 🔧 Technical Features
- **Scalable Architecture**: Microservices with Docker and Kubernetes support
- **CDN Integration**: Global content delivery with multiple CDN providers
- **Video Processing**: FFmpeg-based transcoding pipeline
- **Real-time Features**: WebSocket notifications, live streaming support
- **Security**: JWT authentication, DRM protection, HTTPS everywhere

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS with custom Netflix-like theme
- **UI Components**: Radix UI primitives with ShadCN
- **Video Player**: Shaka Player for HLS/DASH streaming
- **Animations**: Framer Motion for smooth transitions
- **State Management**: Apollo Client for GraphQL, Context API

### Backend
- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **API**: GraphQL with Apollo Server + REST endpoints
- **Cache**: Redis for session management and caching
- **Search**: ElasticSearch for content indexing
- **Queue**: Bull for background job processing

### Infrastructure
- **Containerization**: Docker with Docker Compose
- **Orchestration**: Kubernetes ready
- **Reverse Proxy**: Nginx with SSL termination
- **Storage**: MinIO (S3-compatible) for video files
- **Monitoring**: Health checks and logging

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **Docker** and Docker Compose
- **PostgreSQL** 15+
- **Redis** 7+
- **ElasticSearch** 8+
- **FFmpeg** for video processing

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd streaming-platform
```

### 2. Environment Setup
```bash
# Copy environment file
cp .env.local.example .env.local

# Update the environment variables with your configuration
# - Database credentials
# - Payment gateway keys (SSLCommerz, Stripe, PayPal)
# - CDN settings
# - External API keys (TMDB, etc.)
```

### 3. Docker Setup (Recommended)
```bash
# Start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### 4. Manual Setup (Alternative)

#### Database Setup
```bash
# Start PostgreSQL and Redis
# Update DATABASE_URL in .env.local

# Navigate to backend
cd backend

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed database with sample data
npm run db:seed
```

#### Backend Setup
```bash
# In backend directory
npm run start:dev
```

#### Frontend Setup
```bash
# In root directory
npm install
npm run dev
```

## 🔧 Configuration

### Environment Variables

#### Core Settings
```env
NODE_ENV=development
PORT=3000
BACKEND_PORT=3001

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/streaming_platform"
REDIS_URL="redis://localhost:6379"
ELASTICSEARCH_URL="http://localhost:9200"

# Authentication
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"
```

#### Payment Gateways
```env
# SSLCommerz (Bangladesh)
SSLCOMMERZ_STORE_ID="your-store-id"
SSLCOMMERZ_STORE_PASSWORD="your-password"
SSLCOMMERZ_IS_LIVE=false

# Stripe
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# PayPal
PAYPAL_CLIENT_ID="your-client-id"
PAYPAL_CLIENT_SECRET="your-client-secret"
PAYPAL_MODE="sandbox"
```

#### CDN & Storage
```env
# AWS S3
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="your-bucket"

# Cloudflare R2
CLOUDFLARE_ACCOUNT_ID="your-account-id"
CLOUDFLARE_API_TOKEN="your-api-token"
CLOUDFLARE_R2_BUCKET="your-bucket"
```

## 📱 API Documentation

### GraphQL Playground
Visit `http://localhost:3001/graphql` for interactive GraphQL playground.

### REST API Endpoints
```
POST /api/auth/login          # User login
POST /api/auth/register       # User registration
POST /api/auth/refresh        # Refresh tokens
GET  /api/content             # Get content list
GET  /api/content/:id         # Get content details
POST /api/upload              # Upload video content
GET  /api/search              # Search content
POST /api/payment/stripe      # Stripe payment
POST /api/payment/sslcommerz  # SSLCommerz payment
```

## 🎥 Video Processing

### Supported Formats
- **Input**: MP4, AVI, MOV, MKV, WebM
- **Output**: HLS (.m3u8), DASH (.mpd)
- **Codecs**: H.264, H.265/HEVC, VP9, AV1
- **Resolutions**: 240p, 360p, 480p, 720p, 1080p, 4K

### Transcoding Pipeline
1. **Upload**: Video uploaded to storage
2. **Queue**: Job added to processing queue
3. **Transcode**: FFmpeg processes multiple bitrates
4. **Package**: HLS/DASH segments created
5. **CDN**: Files distributed to CDN
6. **Notify**: User notified when ready

## 🔐 Security Features

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (User, Admin, Moderator)
- Session management with Redis
- Password hashing with bcrypt

### Content Protection
- DRM integration (Widevine, FairPlay, PlayReady)
- Tokenized video URLs with expiration
- Geo-restrictions and IP blocking
- HTTPS everywhere with SSL/TLS

### Data Protection
- GDPR/CCPA compliance features
- Data encryption at rest and in transit
- Secure payment processing (PCI DSS)
- Rate limiting and DDoS protection

## 📊 Admin Dashboard

### Content Management
- Upload and manage video content
- Auto-fetch metadata from TMDB/OMDB
- Organize content by categories and genres
- Schedule content releases

### User Management
- View and manage user accounts
- Monitor subscription status
- Handle support tickets
- Ban/unban users

### Analytics
- View count and engagement metrics
- Revenue and subscription analytics
- Content performance reports
- User behavior insights

### Ad Management
- Create and manage ad campaigns
- Target ads by demographics
- Track ad performance
- Revenue optimization

## 🚀 Deployment

### Production Deployment

#### Docker Production
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d
```

#### Kubernetes
```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get pods
kubectl get services
```

#### CDN Setup
1. Configure your CDN (Cloudflare, AWS CloudFront, etc.)
2. Update video URLs to use CDN endpoints
3. Set up SSL certificates
4. Configure cache policies

### Monitoring & Logging
- Health check endpoints
- Application metrics with Prometheus
- Log aggregation with ELK stack
- Error tracking with Sentry

## 🧪 Testing

### Run Tests
```bash
# Frontend tests
npm test

# Backend tests
cd backend && npm test

# E2E tests
npm run test:e2e
```

### Test Coverage
- Unit tests for components and services
- Integration tests for API endpoints
- E2E tests for critical user flows
- Performance testing for video streaming

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- [API Documentation](docs/api.md)
- [Deployment Guide](docs/deployment.md)
- [Video Processing Guide](docs/video-processing.md)
- [Payment Integration Guide](docs/payments.md)

### Community
- [Discord Server](https://discord.gg/streamflix)
- [GitHub Discussions](https://github.com/streamflix/discussions)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/streamflix)

### Commercial Support
For enterprise support and custom development, contact: support@streamflix.com

---

## 🎯 Roadmap

### Phase 1 (MVP) ✅
- [x] Basic video streaming
- [x] User authentication
- [x] Content management
- [x] Payment integration

### Phase 2 (Advanced Features) 🚧
- [ ] Live streaming support
- [ ] Mobile apps (React Native)
- [ ] Advanced analytics
- [ ] AI-powered recommendations

### Phase 3 (Enterprise) 📋
- [ ] Multi-tenant architecture
- [ ] Advanced DRM
- [ ] Global CDN optimization
- [ ] Enterprise SSO integration

---

**Built with ❤️ by the StreamFlix Team**
#   S t r e a m F l i x   -   N e t f l i x - l i k e   S t r e a m i n g   P l a t f o r m  
 