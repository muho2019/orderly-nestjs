import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;
  let repositoryMock: Record<string, jest.Mock>;

  beforeEach(async () => {
    repositoryMock = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: repositoryMock,
        },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('register', () => {
    const dto: CreateUserDto = {
      email: 'user@example.com',
      password: 'password123',
      name: 'Test User',
    };

    it('should create a new user when email is unique', async () => {
      repositoryMock.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      repositoryMock.save.mockImplementation(async (user) => Object.assign(user, { id: 'uuid' }));

      const result = await service.register(dto);

      expect(repositoryMock.findOne).toHaveBeenCalledWith({ where: { email: dto.email } });
      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 12);
      expect(repositoryMock.save).toHaveBeenCalled();

      const savedUser = repositoryMock.save.mock.calls[0][0] as User;
      expect(savedUser.email).toBe(dto.email);
      expect(savedUser.name).toBe(dto.name);
      expect(savedUser.credentials.hash).toBe('hashed-password');
      expect(savedUser.status).toBe('ACTIVE');
      expect(result).toMatchObject({ id: 'uuid', email: dto.email });
    });

    it('should throw ConflictException when email already exists', async () => {
      repositoryMock.findOne.mockResolvedValue({ id: 'existing' });

      await expect(service.register(dto)).rejects.toBeInstanceOf(ConflictException);
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(repositoryMock.save).not.toHaveBeenCalled();
    });
  });
});
