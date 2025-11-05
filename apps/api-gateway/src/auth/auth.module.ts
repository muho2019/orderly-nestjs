import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthTokenService } from './services/auth-token.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const timeoutValue = configService.get<string>('AUTH_SERVICE_TIMEOUT');
        const timeout =
          timeoutValue && !Number.isNaN(Number(timeoutValue)) ? Number(timeoutValue) : 5000;

        return {
          baseURL: configService.get<string>(
            'AUTH_SERVICE_BASE_URL',
            'http://localhost:3000/v1/auth'
          ),
          timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        };
      }
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthTokenService, JwtAuthGuard],
  exports: [AuthService]
})
export class AuthModule {}
