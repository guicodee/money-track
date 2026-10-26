import { AppError } from "@src/errors/error";
import type { ISessionRepository } from "@src/repositories/interfaces/session-repository-interface";
import type { IUserRepository } from "@src/repositories/interfaces/user-repository-interface";
import type { BcryptHash } from "@src/utils/bcrypt";
import { generateAccessToken, generateRefreshToken, hashToken } from "@src/utils/token";

interface AutenticateRequest {
  email: string;
  password: string;
  userAgent?: string;
  ipAddress?: string;
}

export class AutenticateService {
  constructor(
    private usersRepository: IUserRepository,
    private sessionRepository: ISessionRepository,
    private bcrypt: BcryptHash
  ) {}

  async execute({ email, password, userAgent, ipAddress }: AutenticateRequest) {
    const user = await this.usersRepository.findByEmail(email);

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const passwordMatch = await this.bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      throw new AppError('Invalid credentials', 401);
    }

    const payload = { sub: user.id, email: user.email };

    const refreshToken = generateRefreshToken({ sub: user.id, email: user.email });
    const session = await this.sessionRepository.create({
      userId: user.id,
      refreshTokenHash: hashToken(refreshToken),
      userAgent,
      ipAddress,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    const accessToken = generateAccessToken({
      sub: user.id,
      email: user.email,
      sid: session.id,
    });

    await this.sessionRepository.create({
      userId: user.id,
      refreshTokenHash: await this.bcrypt.hash(refreshToken),
      userAgent,
      ipAddress,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  }
}