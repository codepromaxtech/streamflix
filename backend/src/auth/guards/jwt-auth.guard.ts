import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private jwtService?: JwtService,
    private configService?: ConfigService,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    // Allow passport jwt strategy or check cookie/bearer fallback
    const authHeader = request.headers?.authorization;
    const cookieToken = request.cookies?.accessToken;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const token = bearerToken || cookieToken;

    if (this.jwtService) {
      const secret =
        this.configService?.get<string>('JWT_SECRET') || 'streamflix-secret-key';

      // First try primary token (bearer or cookie)
      if (token) {
        try {
          const payload = this.jwtService.verify(token, { secret });
          request.user = { id: payload.sub, email: payload.email, role: payload.role };
          return true;
        } catch (e) {
          // If bearer token failed/expired, try cookieToken if available and different
          if (bearerToken && cookieToken && cookieToken !== bearerToken) {
            try {
              const cookiePayload = this.jwtService.verify(cookieToken, { secret });
              request.user = {
                id: cookiePayload.sub,
                email: cookiePayload.email,
                role: cookiePayload.role,
              };
              return true;
            } catch (e2) {
              // Both failed, proceed to passport fallback
            }
          }
        }
      }
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      const message = info?.message ? `Authentication required: ${info.message}` : 'Authentication required';
      throw err || new UnauthorizedException(message);
    }
    return user;
  }
}
