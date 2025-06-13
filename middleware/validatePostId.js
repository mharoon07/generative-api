import { logger } from "../config/logger.js";

const validatePostId = (req, res, next) => {
    const { postId } = req.body;
    if (!postId) {
        logger.error("Missing Post ID.");
        return res.status(400).json({ error: "Post ID is required" });
    }
    req.postId = postId;
    next();
};

export default validatePostId;