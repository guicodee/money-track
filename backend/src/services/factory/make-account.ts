import { AccountRepository } from "@src/repositories/implementations/account-repository";
import { CreateAccountService } from "../account/create-account.service";
import { DeleteAccountService } from "../account/delete-account.service";
import { GetMyAccountService } from "../account/get-my-account.service";
import { UpdateAccountService } from "../account/update-account.service";

const accountRepository = new AccountRepository();

export const MakeCreateAccount = () => new CreateAccountService(accountRepository);
export const MakeGetMyAccount = () => new GetMyAccountService(accountRepository);
export const MakeUpdateAccount = () => new UpdateAccountService(accountRepository);
export const MakeDeleteAccount = () => new DeleteAccountService(accountRepository);