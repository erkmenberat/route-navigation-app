import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';

type User = {
    Name : string, 
    Email: string, 
    Password : string;
};

@Injectable()
export class AuthService 
{
    constructor(private prisma: PrismaService, private jwt: JwtService) {}

    async register(newUser : User): Promise<{ access_token: string }>{
        const salt = await bcrypt.genSalt();
        const hash = await bcrypt.hash(newUser.Password, salt);

        const user = await this.prisma.user.create({
            data: {
                name: newUser.Name, 
                email: newUser.Email, 
                password: hash, 
            }
        });

        const payload = { username: newUser.Name };
        return{
            access_token: await this.jwt.signAsync(payload),
        }
    }
}
