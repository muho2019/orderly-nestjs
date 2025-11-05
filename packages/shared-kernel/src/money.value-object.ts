export class MoneyValue {
  private constructor(
    public readonly amount: number,
    public readonly currency: string
  ) {}

  static from(amount: number, currency: string): MoneyValue {
    if (!Number.isInteger(amount)) {
      throw new Error('amount must be an integer representing the smallest currency unit');
    }

    if (amount < 0) {
      throw new Error('amount must be greater than or equal to zero');
    }

    if (currency.length !== 3) {
      throw new Error('currency must be a 3-letter ISO code');
    }

    return new MoneyValue(amount, currency.toUpperCase());
  }

  multiply(quantity: number): MoneyValue {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('quantity must be a positive integer');
    }

    return MoneyValue.from(this.amount * quantity, this.currency);
  }

  add(other: MoneyValue): MoneyValue {
    if (this.currency !== other.currency) {
      throw new Error('currency mismatch when adding money values');
    }

    return MoneyValue.from(this.amount + other.amount, this.currency);
  }

  equals(other: MoneyValue): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }
}
