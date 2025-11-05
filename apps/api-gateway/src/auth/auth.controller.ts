import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards
} from '@nestjs/common';
import type { Request } from 'express';
import { RegisterRequestDto } from './dto/register-request.dto';
import { AuthService } from './auth.service';
import { LoginRequestDto } from './dto/login-request.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UpdateProfileRequestDto } from './dto/update-profile-request.dto';
import { ChangePasswordRequestDto } from './dto/change-password-request.dto';
import { LoginResponse, UserProfile } from './interfaces/auth.interfaces';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterRequestDto): Promise<UserProfile> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginRequestDto): Promise<LoginResponse> {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Req() request: Request): Promise<UserProfile> {
    return this.authService.getProfile(this.getAuthorization(request));
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateProfile(
    @Req() request: Request,
    @Body() dto: UpdateProfileRequestDto
  ): Promise<UserProfile> {
    return this.authService.updateProfile(this.getAuthorization(request), dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  changePassword(
    @Req() request: Request,
    @Body() dto: ChangePasswordRequestDto
  ): Promise<void> {
    return this.authService.changePassword(this.getAuthorization(request), dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Req() request: Request): Promise<void> {
    return this.authService.logout(this.getAuthorization(request));
  }

  private getAuthorization(request: Request): string {
    const header = request.headers.authorization;
    if (typeof header !== 'string' || header.trim().length === 0) {
      throw new UnauthorizedException('Authorization header is required');
    }
    return header;
  }
}
