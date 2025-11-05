import {
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { isAxiosError } from 'axios';
import { randomUUID } from 'node:crypto';
import { RegisterRequestDto } from './dto/register-request.dto';
import { LoginRequestDto } from './dto/login-request.dto';
import { UserProfile, LoginResponse } from './interfaces/auth.interfaces';
import { UpdateProfileRequestDto } from './dto/update-profile-request.dto';
import { ChangePasswordRequestDto } from './dto/change-password-request.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {}

  private get defaultHeaders(): Record<string, string> {
    const correlation = this.configService.get<string>('CORRELATION_HEADER', 'x-correlation-id');
    return {
      [correlation]: randomUUID()
    };
  }

  async register(dto: RegisterRequestDto): Promise<UserProfile> {
    return this.post<UserProfile>('register', dto);
  }

  async login(dto: LoginRequestDto): Promise<LoginResponse> {
    return this.post<LoginResponse>('login', dto);
  }

  async getProfile(authorization: string): Promise<UserProfile> {
    return this.get<UserProfile>('me', authorization);
  }

  async updateProfile(
    authorization: string,
    dto: UpdateProfileRequestDto
  ): Promise<UserProfile> {
    return this.patch<UserProfile>('me', dto, authorization);
  }

  async changePassword(authorization: string, dto: ChangePasswordRequestDto): Promise<void> {
    await this.post<void>('change-password', dto, authorization);
  }

  async logout(authorization: string): Promise<void> {
    await this.post<void>('logout', {}, authorization);
  }

  private async get<T>(path: string, authorization: string): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<T>(path, {
          headers: this.buildHeaders(authorization)
        })
      );
      return response.data;
    } catch (error) {
      throw this.mapAxiosError(error);
    }
  }

  private async post<T>(
    path: string,
    payload: unknown,
    authorization?: string
  ): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<T>(path, payload, {
          headers: this.buildHeaders(authorization)
        })
      );
      return response.data;
    } catch (error) {
      throw this.mapAxiosError(error);
    }
  }

  private async patch<T>(
    path: string,
    payload: unknown,
    authorization: string
  ): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.patch<T>(path, payload, {
          headers: this.buildHeaders(authorization)
        })
      );
      return response.data;
    } catch (error) {
      throw this.mapAxiosError(error);
    }
  }

  private buildHeaders(authorization?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.defaultHeaders
    };

    if (authorization) {
      headers.Authorization = authorization;
    }

    return headers;
  }

  private mapAxiosError(error: unknown): Error {
    if (isAxiosError(error)) {
      if (error.response) {
        const status = error.response.status ?? HttpStatus.BAD_GATEWAY;
        const data = error.response.data ?? { message: 'Auth service responded with an error' };
        throw new HttpException(data, status);
      }

      throw new ServiceUnavailableException('Unable to reach auth service');
    }

    return new InternalServerErrorException('Unexpected error while contacting auth service');
  }
}
