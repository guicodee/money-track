import type { createUserDto, userDto } from "@src/dto/user-dto";

export interface IUserRepository {
  createUser(data: createUserDto): Promise<userDto>;
  findByEmail(email: string): Promise<userDto | null>;
  findById(id: number): Promise<userDto | null>;
  deleteById(id: number): Promise<void>;
}