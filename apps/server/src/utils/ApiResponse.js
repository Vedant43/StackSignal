export class ApiResponse {
    constructor(statusCode, message, data = null) {
        this.statusCode = statusCode;
        this.success = true;
        this.message = message;
        this.data = data;
    }

    send(res) {
        return res.status(this.statusCode).json({
            success: this.success,
            statusCode: this.statusCode,
            message: this.message,
            data: this.data
        });
    }

    static ok(message = "Success", data = null) {
        return new ApiResponse(200, message, data);
    }

    static created(message = "Created", data = null) {
        return new ApiResponse(201, message, data);
    }

    static deleted(message = "Deleted") {
        return new ApiResponse(204, message);
    }

    static noContent(message = "No Content") {
        return new ApiResponse(204, message);
    }
}