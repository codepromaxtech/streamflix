import { Controller, Get, Patch, Body, UseGuards, Param } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  async getProfile(@CurrentUser() user: any) {
    return this.usersService.findById(user.id);
  }

  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: any,
    @Body() data: { name?: string; avatar?: string },
  ) {
    return this.usersService.updateProfile(user.id, data);
  }

  @Get('favorites')
  async getFavorites(@CurrentUser() user: any) {
    return this.usersService.getFavorites(user.id);
  }

  @Get('watch-history')
  async getWatchHistory(@CurrentUser() user: any) {
    return this.usersService.getWatchHistory(user.id);
  }
}
