import express from "express";
import multer from "multer";
import { fal } from "../config/fal.js";
import { pinata } from "../config/pinata.js";
import { logger } from "../config/logger.js";
import axios from "axios";
import validateImage from "../middleware/validateImage.js";
import convertToJpeg from "../middleware/convertToJpeg.js";
import validatePostId from "../middleware/validatePostId.js";
import updatePost from "../utils/updatePost.js";

const router = express.Router(); //

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "image/bmp",
            "image/x-jfif",
        ];
        if (!allowedTypes.includes(file.mimetype)) {
            logger.error("Unsupported file type", { mimetype: file.mimetype });
            return cb(new Error("Unsupported image format"));
        }
        cb(null, true);
    },
});

router.post(
    "/",
    upload.single("image"),
    validateImage,
    convertToJpeg,
    validatePostId,
    async (req, res) => {
        try {
            const uploadedUrl = await fal.storage.upload(
                new File([req.file.buffer], req.file.originalname, {
                    type: req.file.mimetype,
                })
            );

            const response = await fal.subscribe("fal-ai/trellis", {
                input: { image_url: uploadedUrl },
                logs: true,
            });

            if (!response.data?.model_mesh?.url) {
                logger.error("FAL.AI response missing model URL", { response });
                throw new Error("FAL.AI response missing model URL");
            }

            const modelResponse = await axios.get(response.data.model_mesh.url, {
                responseType: "stream",
            });

            const options = {
                pinataMetadata: { name: `${Date.now()}_model.glb` },
                pinataOptions: { cidVersion: 0 },
            };

            const { IpfsHash } = await pinata.pinFileToIPFS(modelResponse.data, options);
            const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${IpfsHash}?filename=${encodeURIComponent(
                options.pinataMetadata.name
            )}`;

            await updatePost(req.postId, gatewayUrl);

            res.status(200).json({ success: true, postId: req.postId, modelUrl: gatewayUrl });
        } catch (error) {
            logger.error("Error during 2D-to-3D conversion", { error: error.message });
            if (error.message.includes("FAL.AI")) {
                return res.status(502).json({ error: "3D model generation failed" });
            } else if (error.message.includes("Firestore")) {
                return res.status(500).json({ error: "Failed to update post data" });
            } else if (error.message.includes("Pinata")) {
                return res.status(502).json({ error: "Failed to upload model to IPFS" });
            }
            res.status(500).json({ error: "Internal server error" });
        }
    }
);

export default router;
