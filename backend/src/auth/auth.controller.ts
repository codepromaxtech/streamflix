import { Controller, Post, Get, Body, Req, Res, UseGuards, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { SecureAuthService } from './secure-auth.service';
import { TwoFactorService } from './two-factor.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly secureAuthService: SecureAuthService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  @Post('login')
  async login(
    @Body('email') email: string,
    @Body('password') password: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.secureAuthService.login(email, password, req, res);
  }

  @Post('register')
  async register(
    @Body('email') email: string,
    @Body('password') password: string,
    @Body('name') name: string,
    @Req() req: Request,
  ) {
    return this.secureAuthService.register(email, password, name, req);
  }

  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.secureAuthService.logout(req, res);
  }

  @Get('me')
  async getMe(@Req() req: Request) {
    // Check Authorization bearer token or cookie
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : (req as any).cookies?.accessToken;

    if (!token) {
      throw new UnauthorizedException('No authentication token provided');
    }

    return this.secureAuthService.getProfile(token);
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.secureAuthService.refreshToken(req, res);
  }

  @Post('2fa/setup')
  async setupTwoFactor(@Body('userId') userId: string): Promise<any> {
    return this.twoFactorService.setupTwoFactor(userId);
  }

  @Post('2fa/verify')
  async verifyTwoFactor(
    @Body('userId') userId: string,
    @Body('token') token: string,
  ): Promise<any> {
    return this.twoFactorService.verifyTwoFactor(userId, token);
  }
}
