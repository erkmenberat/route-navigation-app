import {
    ConflictException,
    Injectable,
    ServiceUnavailableException,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class AuthService 
{
    constructor(private prisma: PrismaService, private jwt: JwtService) {}

    async register(newUser : RegisterDto): Promise<{ access_token: string }>{
        const exists = await this.findUserByEmail(newUser.email);
        if(exists) throw new ConflictException('An account with this email already exists.');

        const salt = await bcrypt.genSalt();
        const hash = await bcrypt.hash(newUser.password, salt);

        await this.createUser(newUser, hash);

        const payload = { username: newUser.name };
        return{
            access_token: await this.jwt.signAsync(payload),
        }
    }

    async login( User: LoginDto ): Promise<{ access_token: string }> {
        const exists = await this.findUserByEmail(User.email);
        if(!exists) throw new ConflictException('You have to Create an Account first.');
    
        const isMatch = await bcrypt.compare(User.password, exists.password);
        if (!isMatch) throw new UnauthorizedException('Wrong Password');

        const payload = { sub: exists.id, username: exists.name };
        return {
            access_token: await this.jwt.signAsync(payload),
        };
  }

    private async findUserByEmail(email: string) {
        try {
            return await this.prisma.user.findUnique({ where: { email }});
        } catch (error) {
            this.throwDatabaseConnectionError(error);
        }
    }

    private async createUser(newUser: RegisterDto, passwordHash: string) {
        try {
            return await this.prisma.user.create({
                data: {
                    name: newUser.name,
                    email: newUser.email,
                    password: passwordHash,
                },
            });
        } catch (error) {
            this.throwDatabaseConnectionError(error);
        }
    }

    private throwDatabaseConnectionError(error: unknown): never {
        const message = error instanceof Error ? error.message.toLowerCase() : '';

        if (
            error instanceof Prisma.PrismaClientInitializationError ||
            message.includes('database') ||
            message.includes('connect') ||
            message.includes('econnrefused')
        ) {
            throw new ServiceUnavailableException(
                'Database connection refused. Start PostgreSQL and check DATABASE_URL.',
            );
        }

        throw error;
    }
}
