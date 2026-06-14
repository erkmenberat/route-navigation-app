import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  const authServiceMock = {
    login: jest.fn(),
    register: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authServiceMock }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('delegates register requests to AuthService', async () => {
    const dto = {
      email: 'test@example.com',
      name: 'Test User',
      password: 'plain-password',
    };
    authServiceMock.register.mockResolvedValue({ access_token: 'register-token' });

    await expect(controller.register(dto)).resolves.toEqual({
      access_token: 'register-token',
    });
    expect(authServiceMock.register).toHaveBeenCalledWith(dto);
  });

  it('delegates login requests to AuthService', async () => {
    const dto = {
      email: 'test@example.com',
      password: 'plain-password',
    };
    authServiceMock.login.mockResolvedValue({ access_token: 'login-token' });

    await expect(controller.login(dto)).resolves.toEqual({
      access_token: 'login-token',
    });
    expect(authServiceMock.login).toHaveBeenCalledWith(dto);
  });

  it('returns the authenticated request user from me', () => {
    const req = {
      user: {
        userId: 7,
        username: 'Test User',
      },
    };

    expect(controller.me(req)).toEqual(req.user);
  });
});
