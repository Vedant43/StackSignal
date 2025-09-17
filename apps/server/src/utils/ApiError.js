class ApiError extends Error {
    constructor(statusCode, message, details = null) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.success = false;
        this.details = details;
    }

    handle(res){
        return res.status(this.statusCode).json({
            success: this.success,
            statusCode: this.statusCode,
            message: this.message,
            details: this.details
        });
    }
    
    static unauthorized(message = "Unauthorized", details = null) {
        return new ApiError(401, message, details);
    }

    static forbidden(message = "Forbidden", details = null) {
        return new ApiError(403, message, details);
    }

    static notFound(message = "Not Found", details = null) {
        return new ApiError(404, message, details);
    }
}

export default ApiError;