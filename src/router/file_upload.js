// router/file_upload.js
/**
 * 处理文件上传至通义千问OSS，并返回文件URL。
 */
const express = require('express');
const multer = require('multer');
const router = express.Router();
const { apiKeyVerify } = require('./index');
const { uploadFileToQwenOss } = require('../lib/qwen_file_uploader');
const accountManager = require('../lib/account');

// Multer 配置: 内存存储，限制10MB
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 限制为10MB
});

/**
 * POST /v1/files/upload
 * 上传单个文件 (multipart/form-data, 字段 "file")。
 */
router.post('/v1/files/upload', apiKeyVerify, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: '未提供文件。请确保在 "file" 字段中包含文件。' });
  }

  try {
    const fileBuffer = req.file.buffer;
    const originalFilename = req.file.originalname;

    const qwenAuthToken = accountManager.getAccountToken();
    if (!qwenAuthToken) {
      return res.status(500).json({ success: false, error: '无法获取通义千问认证Token。' });
    }

    const uploadResult = await uploadFileToQwenOss(fileBuffer, originalFilename, qwenAuthToken);

    res.status(200).json({
      success: true,
      message: uploadResult.message,
      url: uploadResult.file_url,
      file_id: uploadResult.file_id,
      filename: originalFilename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

  } catch (error) {
    console.error('文件上传到Qwen OSS失败:', error); // 保留错误日志
    let errorMessage = '文件上传失败。';
    if (error.message) {
      errorMessage = error.message;
    }
    res.status(500).json({ success: false, error: errorMessage });
  }
});

module.exports = router;
