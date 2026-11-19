import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MailService } from '../../mail/mail.service.js';
import type { SignupDto } from './dto/signup.dto.js';
import type { LoginDto } from './dto/login.dto.js';

const PASSWORD_SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, PASSWORD_SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: { name: dto.name, email: dto.email, passwordHash },
    });

    await this.sendVerificationEmail(user.id, user.email);

    return { accessToken: this.signAccessToken(user.id) };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return { accessToken: this.signAccessToken(user.id) };
  }

  async sendVerificationEmail(userId: string, email: string): Promise<void> {
    const verificationToken = this.jwt.sign({ sub: userId, type: 'email-verification' }, { expiresIn: '1d' });
    await this.mail.sendVerificationEmail(email, verificationToken);
  }

  async verifyEmail(token: string): Promise<void> {
    let payload: { sub: string; type: string };
    try {
      payload = this.jwt.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    if (payload.type !== 'email-verification') {
      throw new UnauthorizedException('Invalid verification token');
    }

    await this.prisma.user.update({
      where: { id: payload.sub },
      data: { verificationLevel: 'EMAIL' },
    });
  }

  private signAccessToken(userId: string): string {
    return this.jwt.sign(
      { sub: userId, type: 'access' },
      { expiresIn: (process.env['JWT_EXPIRES_IN'] ?? '7d') as never },
    );
  }
}
