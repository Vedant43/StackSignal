export const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({
            errors: result.error.errors.map(err => err.message)
        });
    }
    req.body = result.data;
    next();
}

