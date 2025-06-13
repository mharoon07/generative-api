import { logger } from "../config/logger.js";

const validateImage = (req, res, next) => {
    if (!req.file) {
        logger.error("No file uploaded.");
        return res.status(400).json({ error: "No file uploaded" });
    }
    next();
};

export default validateImage;