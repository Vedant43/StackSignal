import {PrismaClient } from "@prisma/client";
import { ApiResponse } from '../../utils/ApiResponse.js';
import ApiError from '../../utils/ApiError.js';
import bcrypt from 'bcrypt';
import { hashPassword } from '../../utils/auth.js';
import { generateAccessToken } from "../../services/tokenService.js";

const prisma = new PrismaClient();

export const signUpClient = async (req, res) => {
    const  { name, username, email, password, slug } = req.body;

    const hashedPassword = await hashPassword(password, 10);

    const existingClient = await prisma.client.findFirst({
        where: {
            OR: [
                {
                    email,
                    username,
                    slug
                }
            ]
        }
    });

    if(existingClient){
        throw new ApiError(400, "Client with this email, username or slug already exists");
    }

    // throw error for same slug

    const newClient = await prisma.client.create({
        data: {
            name,
            email,
            password: hashedPassword,
            slug
        }
    });

    // Generate access token for immediate login after signup
    const accessToken = await generateAccessToken({ 
        id: newClient.id,
        email: newClient.email, 
        slug: newClient.slug 
    });

    return new ApiResponse(201, "Client created successfully", { client: newClient, accessToken }).send(res);
}

export const loginClient = async (req, res) => {
    const { email, password } = req.body;

    const client = await prisma.client.findUnique({
        where: {
            email
        }
    });

    if (!client) {
        throw new ApiError(404, "Client not found");
    }

    const isPasswordValid = await bcrypt.compare(password, client.password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credentials");
    }

    const accessToken = await generateAccessToken({ 
        id: client.id,
        email: client.email, 
        slug: client.slug 
    });

    return new ApiResponse(200, "Login successful", { client, accessToken }).send(res);
}