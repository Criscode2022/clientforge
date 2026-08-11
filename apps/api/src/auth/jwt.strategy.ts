import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DatabaseService } from '../database/database.service';

export type JwtPayload = { sub: string; email: string };

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly db: DatabaseService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') || 'clientforge-dev-secret-change-me',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.db.queryOne<{
      id: string;
      email: string;
      name: string;
      company: string | null;
    }>('SELECT id, email, name, company FROM users WHERE id = $1', [payload.sub]);

    if (!user) throw new UnauthorizedException();
    return user;
  }
}
