import { Role } from '../generated/prisma/enums';

export interface JwtRequest {
  user: {
    userId: number;
    username: string;
    role: Role;
  };
}
