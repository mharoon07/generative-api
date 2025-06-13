import express from "express";
import convertImageRouter from "./routes/convertImage.js";

const app = express();
app.use(express.json());

app.get("/", (req, res) => res.send("Welcome to the 2D-to-3D conversion API!"));
app.use("/convert-image", convertImageRouter);

app.use((err, req, res, next) => {
  if (err.message.includes("Unsupported image format")) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));