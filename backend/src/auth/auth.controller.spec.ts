import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  const tokens = { access_token: 'at', refresh_token: 'rt' };

  const authServiceMock = {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authServiceMock }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('register', () => {
    it('delegates to AuthService.register and returns the token pair', async () => {
      authServiceMock.register.mockResolvedValue(tokens);
      const dto = { email: 'alice@example.com', name: 'Alice', password: 'pw' };

      await expect(controller.register(dto)).resolves.toEqual(tokens);
      expect(authServiceMock.register).toHaveBeenCalledWith(dto);
    });
  });

  describe('login', () => {
    it('delegates to AuthService.login and returns the token pair', async () => {
      authServiceMock.login.mockResolvedValue(tokens);
      const dto = { email: 'alice@example.com', password: 'pw' };

      await expect(controller.login(dto)).resolves.toEqual(tokens);
      expect(authServiceMock.login).toHaveBeenCalledWith(dto);
    });
  });

  describe('refresh', () => {
    it('extracts refreshToken from the body DTO and delegates to AuthService.refresh', async () => {
      authServiceMock.refresh.mockResolvedValue(tokens);

      await expect(
        controller.refresh({ refreshToken: 'rt-value' }),
      ).resolves.toEqual(tokens);
      expect(authServiceMock.refresh).toHaveBeenCalledWith('rt-value');
    });
  });

  describe('logout', () => {
    it('extracts refreshToken from the body DTO and delegates to AuthService.logout', async () => {
      authServiceMock.logout.mockResolvedValue(undefined);

      await expect(
        controller.logout({ refreshToken: 'rt-value' }),
      ).resolves.toBeUndefined();
      expect(authServiceMock.logout).toHaveBeenCalledWith('rt-value');
    });
  });

  describe('me', () => {
    it('returns the user object injected by JwtAuthGuard', () => {
      const req = { user: { userId: 1, username: 'Alice' } };

      expect(controller.me(req)).toEqual({ userId: 1, username: 'Alice' });
    });
  });
});
