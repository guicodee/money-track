import type { ListTransactionsDto, PaginatedTransactionsDto } from "@src/dto/transaction-dto";
import type { ITransactionRepository } from "@src/repositories/interfaces/transaction-repostory-interface";
import { addDays, startOfDaySaoPaulo, todayInSaoPaulo } from "@src/utils/date";

const PAGE_SIZE = 10;
const PERIOD_DAYS = { "7d": 7, "30d": 30, "365d": 365 } as const;

export class ListTransactionsService {
  constructor(private readonly transactionRepository: ITransactionRepository) {}

  async execute(params: ListTransactionsDto): Promise<PaginatedTransactionsDto> {
    const { userId, type, accountId, categoryId, startDate, endDate, period, page } = params;

    let from: Date | undefined;
    let to: Date | undefined;

    if (period) {
      const today = todayInSaoPaulo();
      from = startOfDaySaoPaulo(addDays(today, -(PERIOD_DAYS[period] - 1)));
      to = startOfDaySaoPaulo(addDays(today, 1));
    } else {
      if (startDate) from = startOfDaySaoPaulo(startDate);
      if (endDate) to = startOfDaySaoPaulo(addDays(endDate, 1));
    }

    const { items, total } = await this.transactionRepository.list({
      userId,
      type,
      accountId,
      categoryId,
      from,
      to,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    });

    return {
      data: items,
      page,
      limit: PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
    };
  }
}