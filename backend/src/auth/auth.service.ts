import { ConflictException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService 
{
    constructor(private prisma: PrismaService, private jwt: JwtService) {}

    async register(newUser : RegisterDto): Promise<{ access_token: string }>{
        const exists = await this.prisma.user.findUnique({ where: { email: newUser.email }});
        if(exists) throw new ConflictException('Email bereits vergeben');

        const salt = await bcrypt.genSalt();
        const hash = await bcrypt.hash(newUser.password, salt);

        const user = await this.prisma.user.create({
            data: {
                name: newUser.name, 
                email: newUser.email, 
                password: hash, 
            }
        });

        const payload = { username: newUser.name };
        return{
            access_token: await this.jwt.signAsync(payload),
        }
    }

    
}
