#!/bin/bash

# StreamFlix Security Check Script
# This script performs automated security checks on the platform

set -e

echo "🔒 StreamFlix Security Check"
echo "============================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
CRITICAL_ISSUES=0
HIGH_ISSUES=0
MEDIUM_ISSUES=0
LOW_ISSUES=0

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "PASS")
            echo -e "${GREEN}✅ PASS${NC}: $message"
            ;;
        "FAIL")
            echo -e "${RED}❌ FAIL${NC}: $message"
            ;;
        "WARN")
            echo -e "${YELLOW}⚠️  WARN${NC}: $message"
            ;;
        "INFO")
            echo -e "${BLUE}ℹ️  INFO${NC}: $message"
            ;;
    esac
}

# Function to check file exists
check_file() {
    local file=$1
    local description=$2
    if [ -f "$file" ]; then
        print_status "PASS" "$description exists"
        return 0
    else
        print_status "FAIL" "$description missing"
        return 1
    fi
}

# Function to check for security patterns in files
check_security_pattern() {
    local file=$1
    local pattern=$2
    local description=$3
    local severity=$4
    
    if [ -f "$file" ]; then
        if grep -q "$pattern" "$file"; then
            print_status "FAIL" "$description found in $file"
            case $severity in
                "CRITICAL") ((CRITICAL_ISSUES++)) ;;
                "HIGH") ((HIGH_ISSUES++)) ;;
                "MEDIUM") ((MEDIUM_ISSUES++)) ;;
                "LOW") ((LOW_ISSUES++)) ;;
            esac
            return 1
        else
            print_status "PASS" "$description not found in $file"
            return 0
        fi
    else
        print_status "WARN" "$file not found for pattern check"
        return 1
    fi
}

echo ""
echo "🔍 Checking Security Configuration Files..."
echo "============================================"

# Check if security files exist
check_file "SECURITY.md" "Security documentation"
check_file "SECURITY_AUDIT_REPORT.md" "Security audit report"
check_file "src/lib/secure-auth.ts" "Secure authentication implementation"
check_file "src/lib/input-validator.ts" "Input validation library"
check_file "backend/src/auth/secure-auth.service.ts" "Backend secure auth service"
check_file "nginx/nginx.prod.conf" "Production Nginx configuration"

echo ""
echo "🚨 Checking for Critical Security Issues..."
echo "==========================================="

# Check for localStorage usage (should use httpOnly cookies)
check_security_pattern "src/contexts/auth-context.tsx" "localStorage" "localStorage usage for tokens" "CRITICAL"

# Check for hardcoded secrets
check_security_pattern ".env.local.example" "minioadmin" "Default MinIO credentials" "CRITICAL"
check_security_pattern "backend/src" "password.*=.*['\"]" "Hardcoded passwords" "CRITICAL"

# Check for unsafe CSP
check_security_pattern "nginx/nginx.conf" "unsafe-inline" "Unsafe CSP directive" "CRITICAL"

# Check for open CORS
check_security_pattern "nginx/nginx.conf" 'Access-Control-Allow-Origin "\*"' "Open CORS policy" "HIGH"

echo ""
echo "🔐 Checking Authentication Security..."
echo "====================================="

# Check for secure password hashing
if [ -f "backend/src/auth/secure-auth.service.ts" ]; then
    if grep -q "argon2" "backend/src/auth/secure-auth.service.ts"; then
        print_status "PASS" "Using Argon2 for password hashing"
    else
        print_status "FAIL" "Not using Argon2 for password hashing"
        ((HIGH_ISSUES++))
    fi
fi

# Check for rate limiting
if [ -f "backend/src/auth/secure-auth.service.ts" ]; then
    if grep -q "RateLimiterMemory" "backend/src/auth/secure-auth.service.ts"; then
        print_status "PASS" "Rate limiting implemented"
    else
        print_status "FAIL" "Rate limiting not implemented"
        ((HIGH_ISSUES++))
    fi
fi

# Check for JWT security
if [ -f "backend/src/auth/secure-auth.service.ts" ]; then
    if grep -q "httpOnly.*true" "backend/src/auth/secure-auth.service.ts"; then
        print_status "PASS" "JWT tokens using httpOnly cookies"
    else
        print_status "FAIL" "JWT tokens not using httpOnly cookies"
        ((CRITICAL_ISSUES++))
    fi
fi

echo ""
echo "🛡️ Checking Input Validation..."
echo "==============================="

# Check for input validation implementation
if [ -f "src/lib/input-validator.ts" ]; then
    if grep -q "DOMPurify" "src/lib/input-validator.ts"; then
        print_status "PASS" "XSS protection with DOMPurify implemented"
    else
        print_status "FAIL" "XSS protection not implemented"
        ((HIGH_ISSUES++))
    fi
    
    if grep -q "sqlInjectionPatterns" "src/lib/input-validator.ts"; then
        print_status "PASS" "SQL injection protection implemented"
    else
        print_status "FAIL" "SQL injection protection not implemented"
        ((HIGH_ISSUES++))
    fi
fi

echo ""
echo "🌐 Checking Network Security..."
echo "==============================="

# Check Nginx security configuration
if [ -f "nginx/nginx.prod.conf" ]; then
    if grep -q "ssl_protocols TLSv1.2 TLSv1.3" "nginx/nginx.prod.conf"; then
        print_status "PASS" "Modern TLS protocols configured"
    else
        print_status "FAIL" "Weak TLS protocols configured"
        ((HIGH_ISSUES++))
    fi
    
    if grep -q "add_header Strict-Transport-Security" "nginx/nginx.prod.conf"; then
        print_status "PASS" "HSTS header configured"
    else
        print_status "FAIL" "HSTS header not configured"
        ((MEDIUM_ISSUES++))
    fi
    
    if grep -q "add_header X-Content-Type-Options" "nginx/nginx.prod.conf"; then
        print_status "PASS" "Content-Type-Options header configured"
    else
        print_status "FAIL" "Content-Type-Options header not configured"
        ((MEDIUM_ISSUES++))
    fi
fi

echo ""
echo "🐳 Checking Container Security..."
echo "================================="

# Check Docker security
if [ -f "Dockerfile" ]; then
    if grep -q "USER.*nextjs" "Dockerfile"; then
        print_status "PASS" "Container runs as non-root user"
    else
        print_status "FAIL" "Container may run as root user"
        ((HIGH_ISSUES++))
    fi
    
    if grep -q "HEALTHCHECK" "Dockerfile"; then
        print_status "PASS" "Health check configured"
    else
        print_status "WARN" "Health check not configured"
        ((LOW_ISSUES++))
    fi
fi

# Check Kubernetes security
if [ -f "k8s/backend.yaml" ]; then
    if grep -q "runAsNonRoot: true" "k8s/backend.yaml"; then
        print_status "PASS" "Kubernetes pods run as non-root"
    else
        print_status "FAIL" "Kubernetes pods may run as root"
        ((HIGH_ISSUES++))
    fi
    
    if grep -q "readOnlyRootFilesystem: true" "k8s/backend.yaml"; then
        print_status "PASS" "Read-only root filesystem configured"
    else
        print_status "WARN" "Read-only root filesystem not configured"
        ((MEDIUM_ISSUES++))
    fi
fi

echo ""
echo "📊 Checking Dependencies..."
echo "==========================="

# Check for known vulnerable packages
if command -v npm &> /dev/null; then
    print_status "INFO" "Running npm audit..."
    if npm audit --audit-level=high > /dev/null 2>&1; then
        print_status "PASS" "No high-severity vulnerabilities found"
    else
        print_status "FAIL" "High-severity vulnerabilities found in dependencies"
        ((HIGH_ISSUES++))
        echo "Run 'npm audit' for details"
    fi
fi

echo ""
echo "🔍 Checking Environment Configuration..."
echo "========================================"

# Check for .env files in git
if [ -f ".gitignore" ]; then
    if grep -q "\.env" ".gitignore"; then
        print_status "PASS" "Environment files ignored by git"
    else
        print_status "FAIL" "Environment files not ignored by git"
        ((HIGH_ISSUES++))
    fi
fi

# Check for example environment file
if [ -f ".env.local.example" ]; then
    print_status "PASS" "Example environment file exists"
    
    # Check for placeholder values
    if grep -q "your-" ".env.local.example"; then
        print_status "PASS" "Placeholder values used in example file"
    else
        print_status "WARN" "Example file may contain real values"
        ((MEDIUM_ISSUES++))
    fi
fi

echo ""
echo "📝 Checking Documentation..."
echo "============================"

# Check for security documentation
if [ -f "SECURITY.md" ]; then
    if grep -q "CRITICAL" "SECURITY.md"; then
        print_status "PASS" "Security issues documented"
    else
        print_status "WARN" "Security documentation may be incomplete"
        ((LOW_ISSUES++))
    fi
fi

# Check for deployment documentation
if [ -f "DEPLOYMENT.md" ]; then
    if grep -q "Security" "DEPLOYMENT.md"; then
        print_status "PASS" "Security considerations in deployment docs"
    else
        print_status "WARN" "Security not covered in deployment docs"
        ((LOW_ISSUES++))
    fi
fi

echo ""
echo "🎯 Security Check Summary"
echo "========================="

TOTAL_ISSUES=$((CRITICAL_ISSUES + HIGH_ISSUES + MEDIUM_ISSUES + LOW_ISSUES))

echo -e "${RED}Critical Issues: $CRITICAL_ISSUES${NC}"
echo -e "${YELLOW}High Issues: $HIGH_ISSUES${NC}"
echo -e "${BLUE}Medium Issues: $MEDIUM_ISSUES${NC}"
echo -e "${GREEN}Low Issues: $LOW_ISSUES${NC}"
echo "Total Issues: $TOTAL_ISSUES"

echo ""
echo "📋 Recommendations:"
echo "==================="

if [ $CRITICAL_ISSUES -gt 0 ]; then
    echo -e "${RED}🚨 CRITICAL: Fix all critical issues before deployment${NC}"
fi

if [ $HIGH_ISSUES -gt 0 ]; then
    echo -e "${YELLOW}⚠️  HIGH: Address high-priority issues immediately${NC}"
fi

if [ $MEDIUM_ISSUES -gt 0 ]; then
    echo -e "${BLUE}📋 MEDIUM: Plan to fix medium-priority issues${NC}"
fi

if [ $TOTAL_ISSUES -eq 0 ]; then
    echo -e "${GREEN}🎉 All security checks passed!${NC}"
    exit 0
elif [ $CRITICAL_ISSUES -gt 0 ]; then
    echo -e "${RED}❌ Security check failed - Critical issues found${NC}"
    exit 2
elif [ $HIGH_ISSUES -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Security check warning - High-priority issues found${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Security check passed with minor issues${NC}"
    exit 0
fi
