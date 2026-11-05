import { AppError } from "@src/errors/error";
import type { ISessionRepository } from "@src/repositories/interfaces/session-repository-interface";
import type { IUserRepository } from "@src/repositories/interfaces/user-repository-interface";
import type { BcryptHash } from "@src/utils/bcrypt";
import { hashToken, refreshTokenExpiresAt, type TokenService } from "@src/utils/token";

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
    private bcrypt: BcryptHash,
    private tokens: TokenService,
  ) {}

  async execute({ email, password, userAgent, ipAddress }: AutenticateRequest) {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) throw new AppError("Invalid credentials", 401);

    const passwordMatch = await this.bcrypt.compare(password, user.password);
    if (!passwordMatch) throw new AppError("Invalid credentials", 401);

    const refreshToken = this.tokens.generateRefreshToken({ sub: user.id, email: user.email });

    const session = await this.sessionRepository.create({
      userId: user.id,
      refreshTokenHash: hashToken(refreshToken),
      userAgent,
      ipAddress,
      expiresAt: refreshTokenExpiresAt(),
    });

    const accessToken = this.tokens.generateAccessToken({
      sub: user.id,
      email: user.email,
      sid: session.id,
    });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email },
    };
  }
}