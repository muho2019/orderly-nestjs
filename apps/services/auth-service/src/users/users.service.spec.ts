import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn()
}));

describe('UsersService', () => {
  let service: UsersService;
  let repositoryMock: Record<string, jest.Mock>;

  beforeEach(async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

    repositoryMock = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn()
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: repositoryMock
        }
      ]
    }).compile();

    service = moduleRef.get(UsersService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('register', () => {
    const dto: CreateUserDto = {
      email: 'user@example.com',
      password: 'password123',
      name: 'Test User'
    };

    it('should create a new user when email is unique', async () => {
      repositoryMock.findOne.mockResolvedValue(null);
      repositoryMock.create.mockReturnValue({
        id: 'uuid',
        ...dto,
        passwordHash: 'hashed-password',
        status: 'ACTIVE'
      });
      repositoryMock.save.mockImplementation(async (user) => user);

      const result = await service.register(dto);

      expect(repositoryMock.findOne).toHaveBeenCalledWith({ where: { email: dto.email } });
      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 12);
      expect(repositoryMock.create).toHaveBeenCalledWith({
        email: dto.email,
        passwordHash: 'hashed-password',
        name: dto.name,
        status: 'ACTIVE'
      });
      expect(result).toEqual({ id: 'uuid', ...dto, passwordHash: 'hashed-password', status: 'ACTIVE' });
    });

    it('should throw ConflictException when email already exists', async () => {
      repositoryMock.findOne.mockResolvedValue({ id: 'existing' });

      await expect(service.register(dto)).rejects.toBeInstanceOf(ConflictException);
      expect(repositoryMock.create).not.toHaveBeenCalled();
    });
  });
});
