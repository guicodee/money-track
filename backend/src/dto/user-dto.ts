export interface createUserDto {
  email: string;
  name: string;
  password: string;
}

export interface userResponseDto {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
}

export interface userDto {
  id: number;
  name: string;
  email: string;
  password: string;
  language: "pt" | "en";
  createdAt: Date;
  updatedAt: Date;
}