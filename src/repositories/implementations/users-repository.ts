import type { createUserDto, userDto } from "@src/dto/user-dto";
import type { IUserRepository } from "../interfaces/user-repository-interface";
import { db } from "@src/db";
import { usersTable } from "@src/db/schema/users";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

export class UsersRepository implements IUserRepository {
  async findById(id: number): Promise<userDto | null> {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1);

    return user ?? null;
  }

  async deleteById(id: number): Promise<void> {
    await db
      .delete(usersTable)
      .where(eq(usersTable.id, id));
  }

  async findByEmail(email: string): Promise<userDto | null> {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    return user ?? null;
  }
  
  async createUser(data: createUserDto): Promise<userDto> {
    const [user] = await db
    .insert(usersTable)
    .values({ 
      name: data.name, 
      email: data.email, 
      password: data.password, 
    }).returning();
    
    return user;
  }
}