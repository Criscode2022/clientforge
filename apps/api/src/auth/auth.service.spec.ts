import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const db = {
    queryOne: jest.fn(),
    query: jest.fn(),
  };
  const jwt = { sign: jest.fn().mockReturnValue('token') } as unknown as JwtService;
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(db as never, jwt);
  });

  it('rejects duplicate registration', async () => {
    db.queryOne.mockResolvedValueOnce({ id: '1' });
    await expect(
      service.register({
        email: 'a@b.com',
        password: 'password1',
        name: 'A',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects bad login', async () => {
    db.queryOne.mockResolvedValueOnce(null);
    await expect(
      service.login({ email: 'a@b.com', password: 'password1' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
