const { formatResponse } = require('../utils/helpers');

const validate = (schema) => (req, res, next) => {
    try {
        schema.parse(req.body);
        next();
    } catch (error) {
        res.status(400);

        let errorMessages = [];
        if (error.errors && Array.isArray(error.errors)) {
            errorMessages = error.errors.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
            }));
        } else {
            errorMessages = [{ message: error.message || 'Validation failed' }];
        }

        return res.json(formatResponse(false, 'Validation failed', { errors: errorMessages }));
    }
};

module.exports = validate;
