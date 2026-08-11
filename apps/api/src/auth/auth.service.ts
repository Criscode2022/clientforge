import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { DatabaseService } from '../database/database.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.db.queryOne('SELECT id FROM users WHERE email = $1', [
      dto.email.toLowerCase(),
    ]);
    if (existing) throw new ConflictException('Email already registered');

    const id = uuid();
    const passwordHash = await bcrypt.hash(dto.password, 10);
    await this.db.query(
      `INSERT INTO users (id, email, password_hash, name, company)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, dto.email.toLowerCase(), passwordHash, dto.name, dto.company ?? null],
    );

    return this.tokenResponse({
      id,
      email: dto.email.toLowerCase(),
      name: dto.name,
      company: dto.company ?? null,
    });
  }

  async login(dto: LoginDto) {
    const user = await this.db.queryOne<{
      id: string;
      email: string;
      name: string;
      company: string | null;
      password_hash: string;
    }>('SELECT id, email, name, company, password_hash FROM users WHERE email = $1', [
      dto.email.toLowerCase(),
    ]);

    if (!user) throw new UnauthorizedException('Invalid email or password');
    const ok = await bcrypt.compare(dto.password, user.password_hash);
    if (!ok) throw new UnauthorizedException('Invalid email or password');

    return this.tokenResponse({
      id: user.id,
      email: user.email,
      name: user.name,
      company: user.company,
    });
  }

  async me(userId: string) {
    const user = await this.db.queryOne<{
      id: string;
      email: string;
      name: string;
      company: string | null;
      created_at: string;
    }>('SELECT id, email, name, company, created_at FROM users WHERE id = $1', [userId]);
    if (!user) throw new UnauthorizedException();
    return user;
  }

  private tokenResponse(user: {
    id: string;
    email: string;
    name: string;
    company: string | null;
  }) {
    const accessToken = this.jwt.sign({ sub: user.id, email: user.email });
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        company: user.company,
      },
    };
  }
}
