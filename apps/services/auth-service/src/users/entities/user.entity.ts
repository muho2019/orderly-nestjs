import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Credentials } from './credentials.value-object';

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column(() => Credentials, { prefix: false })
  credentials!: Credentials;

  @Column({ nullable: true })
  name?: string | null;

  @Column({ default: 'ACTIVE' })
  status!: UserStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  static create(email: string, credentials: Credentials, name: string | null = null): User {
    const user = new User();
    user.email = email;
    user.credentials = credentials;
    user.name = name;
    user.status = 'ACTIVE';
    return user;
  }

  changeStatus(nextStatus: UserStatus): void {
    this.status = nextStatus;
  }
}
