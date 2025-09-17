import { verifyAccessToken } from '../services/tokenService.js';
import ApiError from '../utils/ApiError.js';

// Middleware to verify JWT token
export const authenticateToken = (async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            throw new ApiError(401, 'Access token is required');
        }

        const decoded = verifyAccessToken(token);
        req.user = decoded; // Add decoded user info to request
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            throw new ApiError(401, 'Invalid access token');
        } else if (error.name === 'TokenExpiredError') {
            throw new ApiError(401, 'Access token has expired');
        } else {
            throw new ApiError(401, 'Authentication failed');
        }
    }
});
