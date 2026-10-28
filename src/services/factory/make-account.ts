import { AccountRepository } from "@src/repositories/implementations/account-repository";
import { CreateAccountService } from "../create-account.service";
import { DeleteAccountService } from "../delete-account.service";
import { GetMyAccountService } from "../get-my-account.service";
import { UpdateAccountService } from "../update-account.service";

const accountRepository = new AccountRepository();

export const MakeCreateAccount = () => new CreateAccountService(accountRepository);
export const MakeGetMyAccount = () => new GetMyAccountService(accountRepository);
export const MakeUpdateAccount = () => new UpdateAccountService(accountRepository);
export const MakeDeleteAccount = () => new DeleteAccountService(accountRepository);