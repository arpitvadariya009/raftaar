const { formatResponse } = require('../utils/helpers');

const validateRequest = (schema) => {
    return (req, res, next) => {
        try {
            schema.parse(req.body);
            next();
        } catch (error) {
            // Check if it's a Zod error
            if (error.name === 'ZodError') {
                const formattedErrors = error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }));

                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: formattedErrors
                });
            }

            // Generic error fallback
            return res.status(500).json(formatResponse(false, 'Internal validation error'));
        }
    };
};

module.exports = validateRequest;
