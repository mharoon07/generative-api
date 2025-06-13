import sharp from "sharp";
import { logger } from "../config/logger.js";

const convertToJpeg = async (req, res, next) => {
    if (!req.file) return next();

    const { mimetype, buffer, originalname } = req.file;
    const isJpegOrPng = ["image/jpeg", "image/png"].includes(mimetype);

    if (isJpegOrPng) {
        logger.info("Image is already JPEG or PNG", { mimetype });
        return next();
    }

    try {
        const convertedBuffer = await sharp(buffer)
            .jpeg({ quality: 80 })
            .toBuffer();
        req.file = {
            ...req.file,
            buffer: convertedBuffer,
            mimetype: "image/jpeg",
            originalname: originalname.replace(/\.[^/.]+$/, ".jpg"),
            size: convertedBuffer.length,
        };
        logger.info("Image converted to JPEG", {
            newMimetype: req.file.mimetype,
            newSize: req.file.size,
        });
        next();
    } catch (error) {
        logger.error("Failed to convert image to JPEG", { error: error.message });
        res.status(500).json({ error: "Failed to convert image to JPEG" });
    }
};

export default convertToJpeg;