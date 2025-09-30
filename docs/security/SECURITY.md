# 🔒 StreamFlix Security Review & Hardening Guide

## 🚨 CRITICAL SECURITY ISSUES IDENTIFIED & FIXES

### ❌ **HIGH PRIORITY SECURITY VULNERABILITIES**

#### 1. **JWT Token Storage in localStorage (CRITICAL)**
**Issue**: JWT tokens stored in localStorage are vulnerable to XSS attacks.

**Current Code (VULNERABLE):**
```javascript
// src/contexts/auth-context.tsx:20, 58, 97
localStorage.setItem('auth-token', token)
localStorage.getItem('auth-token')
localStorage.removeItem('auth-token')
```

**✅ SECURE FIX:**
```javascript
// Use httpOnly cookies instead
const login = async (email: string, password: string) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'include', // Include cookies
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  // Token will be set as httpOnly cookie by backend
}
```

#### 2. **Hardcoded Default Credentials (CRITICAL)**
**Issue**: Default MinIO credentials exposed in environment files.

**Current Code (VULNERABLE):**
```bash
# .env.local.example:75-76
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin123"
```

**✅ SECURE FIX:**
```bash
# Generate strong random credentials
MINIO_ACCESS_KEY="$(openssl rand -base64 32)"
MINIO_SECRET_KEY="$(openssl rand -base64 64)"
```

#### 3. **Weak Content Security Policy (HIGH)**
**Issue**: CSP allows 'unsafe-inline' which enables XSS attacks.

**Current Code (VULNERABLE):**
```nginx
# nginx/nginx.conf:81
add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
```

**✅ SECURE FIX:**
```nginx
add_header Content-Security-Policy "
  default-src 'self';
  script-src 'self' 'nonce-{random}' https://js.stripe.com;
  style-src 'self' 'nonce-{random}' https://fonts.googleapis.com;
  img-src 'self' data: https: blob:;
  media-src 'self' https: blob:;
  connect-src 'self' https: wss:;
  font-src 'self' https://fonts.gstatic.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
" always;
```

#### 4. **Open CORS Policy for Videos (MEDIUM)**
**Issue**: Videos accessible from any origin.

**Current Code (VULNERABLE):**
```nginx
# nginx/nginx.conf:137
add_header Access-Control-Allow-Origin "*";
```

**✅ SECURE FIX:**
```nginx
# Restrict to your domains only
add_header Access-Control-Allow-Origin "https://streamflix.com";
add_header Vary Origin;
```

#### 5. **Missing Input Validation (HIGH)**
**Issue**: No input sanitization in authentication forms.

**✅ SECURE FIX:**
```javascript
// Add input validation and sanitization
import DOMPurify from 'dompurify'
import validator from 'validator'

const validateAndSanitizeInput = (email: string, password: string) => {
  // Validate email
  if (!validator.isEmail(email)) {
    throw new Error('Invalid email format')
  }
  
  // Validate password strength
  if (!validator.isStrongPassword(password, {
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1
  })) {
    throw new Error('Password does not meet security requirements')
  }
  
  // Sanitize inputs
  return {
    email: validator.normalizeEmail(email) || '',
    password: DOMPurify.sanitize(password)
  }
}
```

## 🔐 **SECURITY HARDENING IMPLEMENTATION**

### **Backend Security Enhancements**

#### 1. **Secure Authentication Service**
```typescript
// backend/src/auth/auth.service.ts
import * as bcrypt from 'bcrypt'
import * as jwt from 'jsonwebtoken'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { RateLimiterMemory } from 'rate-limiter-flexible'

@Injectable()
export class AuthService {
  private rateLimiter = new RateLimiterMemory({
    keyPrefix: 'login_fail',
    points: 5, // Number of attempts
    duration: 900, // Per 15 minutes
    blockDuration: 900, // Block for 15 minutes
  })

  async login(email: string, password: string, ip: string) {
    try {
      // Check rate limiting
      await this.rateLimiter.consume(ip)
      
      // Validate user
      const user = await this.validateUser(email, password)
      if (!user) {
        throw new UnauthorizedException('Invalid credentials')
      }
      
      // Generate secure tokens
      const payload = { sub: user.id, email: user.email, role: user.role }
      const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '15m',
        issuer: 'streamflix',
        audience: 'streamflix-users'
      })
      
      const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
        expiresIn: '7d',
        issuer: 'streamflix',
        audience: 'streamflix-users'
      })
      
      return { user, accessToken, refreshToken }
    } catch (rateLimiterRes) {
      throw new TooManyRequestsException('Too many failed attempts')
    }
  }
  
  private async validateUser(email: string, password: string) {
    const user = await this.userService.findByEmail(email)
    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user
      return result
    }
    return null
  }
}
```

#### 2. **Secure Password Hashing**
```typescript
// Use Argon2 instead of bcrypt for better security
import * as argon2 from 'argon2'

export class PasswordService {
  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64 MB
      timeCost: 3,
      parallelism: 1,
    })
  }
  
  async verifyPassword(hash: string, password: string): Promise<boolean> {
    return argon2.verify(hash, password)
  }
}
```

#### 3. **Secure File Upload**
```typescript
// backend/src/upload/upload.service.ts
import * as fileType from 'file-type'
import * as sharp from 'sharp'

@Injectable()
export class UploadService {
  private readonly allowedVideoTypes = [
    'video/mp4', 'video/webm', 'video/ogg'
  ]
  
  private readonly allowedImageTypes = [
    'image/jpeg', 'image/png', 'image/webp'
  ]
  
  async validateAndProcessFile(file: Express.Multer.File) {
    // Validate file type by content, not extension
    const detectedType = await fileType.fromBuffer(file.buffer)
    
    if (!detectedType) {
      throw new BadRequestException('Invalid file type')
    }
    
    // Check if file type is allowed
    const isValidVideo = this.allowedVideoTypes.includes(detectedType.mime)
    const isValidImage = this.allowedImageTypes.includes(detectedType.mime)
    
    if (!isValidVideo && !isValidImage) {
      throw new BadRequestException('File type not allowed')
    }
    
    // Scan for malware (integrate with ClamAV)
    await this.scanForMalware(file.buffer)
    
    // Process image files
    if (isValidImage) {
      return this.processImage(file.buffer)
    }
    
    return file.buffer
  }
  
  private async processImage(buffer: Buffer) {
    // Strip metadata and resize
    return sharp(buffer)
      .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer()
  }
  
  private async scanForMalware(buffer: Buffer) {
    // Implement virus scanning
    // This is a placeholder - integrate with actual antivirus
    const suspiciousPatterns = [/<script/i, /javascript:/i, /vbscript:/i]
    const content = buffer.toString('utf8', 0, Math.min(buffer.length, 1024))
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        throw new BadRequestException('Potentially malicious file detected')
      }
    }
  }
}
```

### **Frontend Security Enhancements**

#### 1. **Secure HTTP Client**
```typescript
// src/lib/secure-http.ts
class SecureHttpClient {
  private baseURL: string
  private csrfToken: string | null = null
  
  constructor(baseURL: string) {
    this.baseURL = baseURL
    this.initCSRF()
  }
  
  private async initCSRF() {
    try {
      const response = await fetch(`${this.baseURL}/csrf-token`, {
        credentials: 'include'
      })
      const data = await response.json()
      this.csrfToken = data.csrfToken
    } catch (error) {
      console.error('Failed to get CSRF token:', error)
    }
  }
  
  async request(endpoint: string, options: RequestInit = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...(this.csrfToken && { 'X-CSRF-Token': this.csrfToken }),
      ...options.headers
    }
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
      mode: 'cors',
      cache: 'no-store'
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    return response.json()
  }
}

export const secureHttp = new SecureHttpClient(process.env.NEXT_PUBLIC_API_URL!)
```

#### 2. **Input Sanitization Hook**
```typescript
// src/hooks/use-secure-input.ts
import { useState, useCallback } from 'react'
import DOMPurify from 'dompurify'
import validator from 'validator'

export function useSecureInput(initialValue = '') {
  const [value, setValue] = useState(initialValue)
  const [error, setError] = useState('')
  
  const updateValue = useCallback((newValue: string, validationType?: string) => {
    // Sanitize input
    const sanitized = DOMPurify.sanitize(newValue.trim())
    
    // Validate based on type
    let isValid = true
    let errorMessage = ''
    
    switch (validationType) {
      case 'email':
        isValid = validator.isEmail(sanitized)
        errorMessage = 'Please enter a valid email address'
        break
      case 'password':
        isValid = validator.isStrongPassword(sanitized)
        errorMessage = 'Password must be at least 8 characters with uppercase, lowercase, number, and symbol'
        break
      case 'url':
        isValid = validator.isURL(sanitized)
        errorMessage = 'Please enter a valid URL'
        break
    }
    
    setError(isValid ? '' : errorMessage)
    setValue(sanitized)
    
    return { value: sanitized, isValid }
  }, [])
  
  return { value, error, updateValue }
}
```

### **Infrastructure Security**

#### 1. **Secure Docker Configuration**
```dockerfile
# Use non-root user
FROM node:18-alpine

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY --chown=nextjs:nodejs . .

# Remove unnecessary files
RUN rm -rf .git .gitignore README.md

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["npm", "start"]
```

#### 2. **Secure Kubernetes Configuration**
```yaml
# k8s/security-policies.yaml
apiVersion: v1
kind: Pod
metadata:
  name: streamflix-pod
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1001
    runAsGroup: 1001
    fsGroup: 1001
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: app
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
        - ALL
    resources:
      limits:
        memory: "1Gi"
        cpu: "500m"
      requests:
        memory: "512Mi"
        cpu: "250m"
```

### **Database Security**

#### 1. **Secure Database Configuration**
```sql
-- Create dedicated database user with minimal privileges
CREATE USER streamflix_app WITH PASSWORD 'secure_random_password';
GRANT CONNECT ON DATABASE streaming_platform TO streamflix_app;
GRANT USAGE ON SCHEMA public TO streamflix_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO streamflix_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO streamflix_app;

-- Enable row level security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create security policies
CREATE POLICY user_isolation ON users
  FOR ALL TO streamflix_app
  USING (id = current_setting('app.current_user_id')::uuid);
```

#### 2. **Database Connection Security**
```typescript
// backend/src/database/database.config.ts
export const databaseConfig = {
  url: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true,
    ca: fs.readFileSync('/path/to/ca-certificate.crt').toString(),
  } : false,
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
  },
  // Enable query logging in development only
  logging: process.env.NODE_ENV === 'development',
}
```

## 🛡️ **SECURITY MONITORING & ALERTING**

### **1. Security Event Logging**
```typescript
// backend/src/security/security-logger.service.ts
@Injectable()
export class SecurityLoggerService {
  private logger = new Logger('SecurityLogger')
  
  logFailedLogin(email: string, ip: string, userAgent: string) {
    this.logger.warn('Failed login attempt', {
      email,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
      event: 'FAILED_LOGIN'
    })
  }
  
  logSuspiciousActivity(userId: string, activity: string, metadata: any) {
    this.logger.error('Suspicious activity detected', {
      userId,
      activity,
      metadata,
      timestamp: new Date().toISOString(),
      event: 'SUSPICIOUS_ACTIVITY'
    })
  }
  
  logDataAccess(userId: string, resource: string, action: string) {
    this.logger.log('Data access', {
      userId,
      resource,
      action,
      timestamp: new Date().toISOString(),
      event: 'DATA_ACCESS'
    })
  }
}
```

### **2. Intrusion Detection**
```typescript
// backend/src/security/intrusion-detection.service.ts
@Injectable()
export class IntrusionDetectionService {
  private suspiciousPatterns = [
    /union.*select/i,
    /<script.*>/i,
    /javascript:/i,
    /eval\(/i,
    /document\.cookie/i
  ]
  
  detectSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /('|(\-\-)|(;)|(\||\|)|(\*|\*))/,
      /(union|select|insert|delete|update|drop|create|alter|exec|execute)/i
    ]
    
    return sqlPatterns.some(pattern => pattern.test(input))
  }
  
  detectXSS(input: string): boolean {
    return this.suspiciousPatterns.some(pattern => pattern.test(input))
  }
  
  analyzeRequest(req: Request): SecurityThreat[] {
    const threats: SecurityThreat[] = []
    
    // Check for SQL injection in query parameters
    Object.values(req.query).forEach(value => {
      if (typeof value === 'string' && this.detectSQLInjection(value)) {
        threats.push({
          type: 'SQL_INJECTION',
          severity: 'HIGH',
          source: 'query_parameter',
          value
        })
      }
    })
    
    // Check for XSS in request body
    if (req.body && typeof req.body === 'object') {
      Object.values(req.body).forEach(value => {
        if (typeof value === 'string' && this.detectXSS(value)) {
          threats.push({
            type: 'XSS',
            severity: 'HIGH',
            source: 'request_body',
            value
          })
        }
      })
    }
    
    return threats
  }
}
```

## 🔒 **PRODUCTION SECURITY CHECKLIST**

### **✅ Pre-Deployment Security Checklist**

- [ ] **Authentication & Authorization**
  - [ ] JWT tokens stored in httpOnly cookies
  - [ ] Strong password policy enforced
  - [ ] Rate limiting on authentication endpoints
  - [ ] Multi-factor authentication implemented
  - [ ] Session timeout configured
  - [ ] Role-based access control implemented

- [ ] **Input Validation & Sanitization**
  - [ ] All user inputs validated and sanitized
  - [ ] SQL injection protection implemented
  - [ ] XSS protection implemented
  - [ ] File upload validation implemented
  - [ ] CSRF protection enabled

- [ ] **Data Protection**
  - [ ] Sensitive data encrypted at rest
  - [ ] Database connections encrypted (SSL/TLS)
  - [ ] PII data properly handled
  - [ ] Data retention policies implemented
  - [ ] Backup encryption enabled

- [ ] **Network Security**
  - [ ] HTTPS enforced everywhere
  - [ ] Strong SSL/TLS configuration
  - [ ] Security headers implemented
  - [ ] CORS properly configured
  - [ ] API rate limiting enabled

- [ ] **Infrastructure Security**
  - [ ] Containers run as non-root users
  - [ ] Secrets managed securely
  - [ ] Network policies implemented
  - [ ] Resource limits configured
  - [ ] Security scanning enabled

- [ ] **Monitoring & Logging**
  - [ ] Security event logging implemented
  - [ ] Intrusion detection configured
  - [ ] Alert system configured
  - [ ] Log retention policies set
  - [ ] Audit trails enabled

### **🚨 Security Incident Response Plan**

1. **Detection**: Automated monitoring alerts security team
2. **Assessment**: Determine severity and scope of incident
3. **Containment**: Isolate affected systems
4. **Eradication**: Remove threat and vulnerabilities
5. **Recovery**: Restore systems and monitor for reoccurrence
6. **Lessons Learned**: Document and improve security measures

### **📞 Emergency Contacts**
- Security Team: security@streamflix.com
- DevOps Team: devops@streamflix.com
- Legal Team: legal@streamflix.com

---

**⚠️ IMPORTANT**: This security review identifies critical vulnerabilities that must be addressed before production deployment. Implement all HIGH and CRITICAL priority fixes immediately.
