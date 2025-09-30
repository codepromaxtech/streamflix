import DOMPurify from 'isomorphic-dompurify'

export interface ValidationResult {
  isValid: boolean
  sanitizedValue: string
  errors: string[]
}

export class InputValidator {
  private static emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  private static strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
  private static sqlInjectionPatterns = [
    /('|(\\-\\-)|(;)|(\\||\\|)|(\\*|\\*))/,
    /(union|select|insert|delete|update|drop|create|alter|exec|execute)/i,
    /(script|javascript|vbscript|onload|onerror|onclick)/i
  ]

  static validateEmail(email: string): ValidationResult {
    const sanitized = DOMPurify.sanitize(email.trim().toLowerCase())
    const errors: string[] = []

    if (!sanitized) {
      errors.push('Email is required')
    } else if (!this.emailRegex.test(sanitized)) {
      errors.push('Please enter a valid email address')
    } else if (sanitized.length > 254) {
      errors.push('Email address is too long')
    }

    // Check for suspicious patterns
    if (this.containsSuspiciousPatterns(sanitized)) {
      errors.push('Email contains invalid characters')
    }

    return {
      isValid: errors.length === 0,
      sanitizedValue: sanitized,
      errors
    }
  }

  static validatePassword(password: string): ValidationResult {
    const errors: string[] = []

    if (!password) {
      errors.push('Password is required')
    } else {
      if (password.length < 8) {
        errors.push('Password must be at least 8 characters long')
      }
      if (password.length > 128) {
        errors.push('Password is too long (max 128 characters)')
      }
      if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter')
      }
      if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter')
      }
      if (!/\d/.test(password)) {
        errors.push('Password must contain at least one number')
      }
      if (!/[@$!%*?&]/.test(password)) {
        errors.push('Password must contain at least one special character (@$!%*?&)')
      }
      
      // Check for common weak passwords
      const commonPasswords = [
        'password', '123456', 'password123', 'admin', 'qwerty',
        'letmein', 'welcome', 'monkey', '1234567890'
      ]
      if (commonPasswords.includes(password.toLowerCase())) {
        errors.push('Password is too common, please choose a stronger password')
      }
    }

    return {
      isValid: errors.length === 0,
      sanitizedValue: password, // Don't sanitize passwords
      errors
    }
  }

  static validateName(name: string): ValidationResult {
    const sanitized = DOMPurify.sanitize(name.trim())
    const errors: string[] = []

    if (!sanitized) {
      errors.push('Name is required')
    } else if (sanitized.length < 2) {
      errors.push('Name must be at least 2 characters long')
    } else if (sanitized.length > 100) {
      errors.push('Name is too long (max 100 characters)')
    } else if (!/^[a-zA-Z\s'-]+$/.test(sanitized)) {
      errors.push('Name can only contain letters, spaces, hyphens, and apostrophes')
    }

    // Check for suspicious patterns
    if (this.containsSuspiciousPatterns(sanitized)) {
      errors.push('Name contains invalid characters')
    }

    return {
      isValid: errors.length === 0,
      sanitizedValue: sanitized,
      errors
    }
  }

  static validateSearchQuery(query: string): ValidationResult {
    const sanitized = DOMPurify.sanitize(query.trim())
    const errors: string[] = []

    if (sanitized.length > 200) {
      errors.push('Search query is too long (max 200 characters)')
    }

    // Check for SQL injection patterns
    if (this.containsSQLInjection(sanitized)) {
      errors.push('Search query contains invalid characters')
    }

    return {
      isValid: errors.length === 0,
      sanitizedValue: sanitized,
      errors
    }
  }

  static validateURL(url: string): ValidationResult {
    const sanitized = DOMPurify.sanitize(url.trim())
    const errors: string[] = []

    if (!sanitized) {
      errors.push('URL is required')
    } else {
      try {
        const urlObj = new URL(sanitized)
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
          errors.push('URL must use HTTP or HTTPS protocol')
        }
      } catch {
        errors.push('Please enter a valid URL')
      }
    }

    return {
      isValid: errors.length === 0,
      sanitizedValue: sanitized,
      errors
    }
  }

  static validateFileUpload(file: File): ValidationResult {
    const errors: string[] = []
    const allowedTypes = [
      'video/mp4', 'video/webm', 'video/ogg',
      'image/jpeg', 'image/png', 'image/webp'
    ]
    const maxSize = 100 * 1024 * 1024 // 100MB

    if (!file) {
      errors.push('File is required')
    } else {
      if (!allowedTypes.includes(file.type)) {
        errors.push('File type not allowed. Please upload MP4, WebM, OGG, JPEG, PNG, or WebP files')
      }
      if (file.size > maxSize) {
        errors.push('File size too large. Maximum size is 100MB')
      }
      if (file.name.length > 255) {
        errors.push('File name is too long')
      }
      
      // Check for suspicious file names
      const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com']
      const hassuspicious = suspiciousExtensions.some(ext => 
        file.name.toLowerCase().includes(ext)
      )
      if (hassuspicious) {
        errors.push('File type not allowed for security reasons')
      }
    }

    return {
      isValid: errors.length === 0,
      sanitizedValue: file?.name || '',
      errors
    }
  }

  private static containsSuspiciousPatterns(input: string): boolean {
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /on\w+\s*=/i,
      /data:text\/html/i,
      /eval\(/i,
      /expression\(/i
    ]

    return suspiciousPatterns.some(pattern => pattern.test(input))
  }

  private static containsSQLInjection(input: string): boolean {
    return this.sqlInjectionPatterns.some(pattern => pattern.test(input))
  }

  static sanitizeHTML(html: string): string {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
      ALLOWED_ATTR: []
    })
  }

  static escapeHTML(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
}

// Rate limiting for client-side validation
export class ClientRateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map()
  private maxAttempts: number
  private windowMs: number

  constructor(maxAttempts = 5, windowMs = 15 * 60 * 1000) { // 5 attempts per 15 minutes
    this.maxAttempts = maxAttempts
    this.windowMs = windowMs
  }

  canAttempt(identifier: string): boolean {
    const now = Date.now()
    const record = this.attempts.get(identifier)

    if (!record || now > record.resetTime) {
      this.attempts.set(identifier, { count: 1, resetTime: now + this.windowMs })
      return true
    }

    if (record.count >= this.maxAttempts) {
      return false
    }

    record.count++
    return true
  }

  getRemainingTime(identifier: string): number {
    const record = this.attempts.get(identifier)
    if (!record) return 0
    
    const now = Date.now()
    return Math.max(0, record.resetTime - now)
  }

  reset(identifier: string): void {
    this.attempts.delete(identifier)
  }
}

export const loginRateLimiter = new ClientRateLimiter(5, 15 * 60 * 1000) // 5 attempts per 15 minutes
