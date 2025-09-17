import jwt from 'jsonwebtoken';
import ApiError from '../utils/ApiError.js';

export const generateAccessToken = (data) => {
    const secret = process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET;
    return jwt.sign(data, secret, { expiresIn: '24h' }); // Increased to 24h for better UX
}

export const verifyAccessToken = (token) => {
    try {
        const secret = process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET;
        return jwt.verify(token, secret);
    } catch (error) {
        throw new ApiError(401, 'Invalid or expired token');
    }
}