import ApiError from "./ApiError.js";
export const errorHandler = (err, req, res, next) => {

    if(err instanceof ApiError) {
        return err.handle(res);
    }

    console.error(err.stack);
    console.error(`Error occurred: ${err.message}`);

    return res.status(500).json({
        success: false,
        statusCode: 500,
        message: 'Internal Server Error',
        details: err.details || null
    });

}