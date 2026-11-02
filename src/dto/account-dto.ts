export type Currency = "BRL" | "USD";

export interface AccountDto {
  id: number;
  name: string;
  initialBalance: string; 
  currentBalance: string; 
  currency: Currency;
  isActive: boolean;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAccountDto {
  userId: number;
  name: string;
  initialBalance: string;
  currency: Currency;
}

export interface UpdateAccountDto {
  name?: string;
  initialBalance: string; 
  isActive?: boolean;
}
