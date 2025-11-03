import { User, UserStatus } from '../entities/user.entity';

export class UserResponseDto {
  constructor(user: User) {
    this.id = user.id;
    this.email = user.email;
    this.name = user.name ?? null;
    this.status = user.status;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
  }

  id: string;

  email: string;

  name: string | null;

  status: UserStatus;

  createdAt: Date;

  updatedAt: Date;
}
