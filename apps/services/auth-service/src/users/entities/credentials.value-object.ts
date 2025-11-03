import { Column } from 'typeorm';

export class Credentials {
  @Column({ name: 'password_hash' })
  private passwordHash!: string;

  static fromHashed(hash: string): Credentials {
    const credentials = new Credentials();
    credentials.passwordHash = hash;
    return credentials;
  }

  get hash(): string {
    return this.passwordHash;
  }
}
