const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { Redis } = require("@upstash/redis");
require('dotenv').config();

// Upstash Redis setup
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Multer Storage setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/documents';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /pdf|jpeg|jpg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only PDF, JPG, and PNG files are allowed'));
    }
});

// Upload Document
router.post('/upload', upload.single('document'), async (req, res) => {
    try {
        const { userId, category } = req.body;
        if (!userId || !category || !req.file) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const docId = uuidv4();
        const document = {
            id: docId,
            filename: req.file.originalname,
            category,
            url: `/uploads/documents/${req.file.filename}`,
            localPath: req.file.path,
            uploadDate: new Date().toISOString(),
            size: req.file.size,
            mimeType: req.file.mimetype,
            isPrimary: category === 'Resume' ? false : undefined
        };

        const redisKey = `user:${userId}:documents`;
        const existingDocsArr = await redis.get(redisKey) || [];
        
        // If it's a resume and the first one, make it primary
        if (category === 'Resume' && !existingDocsArr.some(d => d.category === 'Resume' && d.isPrimary)) {
            document.isPrimary = true;
        }

        existingDocsArr.push(document);
        await redis.set(redisKey, JSON.stringify(existingDocsArr));

        res.json({ success: true, data: document });
    } catch (err) {
        console.error('Upload Error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// List Documents
router.get('/', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ success: false, message: 'UserId required' });

        const redisKey = `user:${userId}:documents`;
        const docs = await redis.get(redisKey) || [];
        res.json({ success: true, data: docs });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Download Document
router.get('/:id/download', async (req, res) => {
    try {
        const { userId } = req.query;
        const { id } = req.params;
        if (!userId) return res.status(400).json({ success: false, message: 'UserId required' });

        const redisKey = `user:${userId}:documents`;
        const docs = await redis.get(redisKey) || [];
        const doc = docs.find(d => d.id === id);

        if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

        res.download(path.join(__dirname, '..', doc.localPath), doc.filename);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Delete Document
router.delete('/:id', async (req, res) => {
    try {
        const { userId } = req.query;
        const { id } = req.params;
        if (!userId) return res.status(400).json({ success: false, message: 'UserId required' });

        const redisKey = `user:${userId}:documents`;
        let docs = await redis.get(redisKey) || [];
        const docToDelete = docs.find(d => d.id === id);

        if (!docToDelete) return res.status(404).json({ success: false, message: 'Document not found' });

        // Remove from file system
        if (fs.existsSync(docToDelete.localPath)) {
            fs.unlinkSync(docToDelete.localPath);
        }

        // Remove from Redis
        docs = docs.filter(d => d.id !== id);
        
        // If we deleted a primary resume, pick another one as primary if available
        if (docToDelete.isPrimary && docs.some(d => d.category === 'Resume')) {
            const firstResume = docs.find(d => d.category === 'Resume');
            if (firstResume) firstResume.isPrimary = true;
        }

        await redis.set(redisKey, JSON.stringify(docs));
        res.json({ success: true, message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Toggle Primary Resume
router.patch('/:id/primary', async (req, res) => {
    try {
        const { userId } = req.query;
        const { id } = req.params;
        if (!userId) return res.status(400).json({ success: false, message: 'UserId required' });

        const redisKey = `user:${userId}:documents`;
        let docs = await redis.get(redisKey) || [];
        
        const docToPrimary = docs.find(d => d.id === id && d.category === 'Resume');
        if (!docToPrimary) return res.status(404).json({ success: false, message: 'Resume not found' });

        docs = docs.map(d => {
            if (d.category === 'Resume') {
                return { ...d, isPrimary: d.id === id };
            }
            return d;
        });

        await redis.set(redisKey, JSON.stringify(docs));
        res.json({ success: true, message: 'Primary resume updated' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
