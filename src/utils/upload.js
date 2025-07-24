const OSS = require('ali-oss')
const uuid = require('uuid')
const accountManager = require('./account')
const mimetypes = require('mime-types')

const GET_STS_TOKEN_URL = "https://chat.qwen.ai/api/v1/files/getstsToken"

/**
 * 从完整MIME类型获取简化的文件类型 (例如 "image", "video")。
 * @param {string} mimeType - 完整的MIME类型 (例如 "image/png", "application/pdf")。
 * @returns {string} 简化文件类型，默认为 "file"。
 */
function getSimpleFileType(mimeType) {
  if (!mimeType) return "file";
  return mimeType.split('/')[0] || "file";
}

/**
 * 请求STS Token。
 * @param {string} filename - 文件名。
 * @param {number} filesize - 文件大小 (字节)。
 * @param {string} filetypeSimple - 简化文件类型 (例如 "image")。
 * @param {string} qwenAuthToken - 从 accountManager 获取的通义千问认证Token (不含 "Bearer ")。
 * @returns {Promise<object>} STS Token响应数据。
 * @throws {Error} 如果请求失败。
 */
async function requestStsToken(filename, filesize, filetypeSimple, qwenAuthToken) {
  const requestId = uuid.v4();
  const bearerToken = qwenAuthToken.startsWith('Bearer ') ? qwenAuthToken : `Bearer ${qwenAuthToken}`;

  const headers = {
    ...accountManager.defaultHeaders,
    "Authorization": bearerToken,
    "x-request-id": requestId,
    "Content-Type": "application/json",
  }
  delete headers.Host

  const payload = { filename, filesize, filetype: filetypeSimple };

  try {
    const response = await axios.post(GET_STS_TOKEN_URL, payload, { headers, timeout: 30000 });
    if (response.status === 200 && response.data) {
      // console.log("[+] 已成功接收到STS Token和文件信息。");
      const stsDataFull = response.data;
      const credentials = {
        access_key_id: stsDataFull.access_key_id,
        access_key_secret: stsDataFull.access_key_secret,
        security_token: stsDataFull.security_token
      };
      const fileInfo = {
        url: stsDataFull.file_url, // 这是最终给大模型的URL
        path: stsDataFull.file_path, // OSS对象路径
        bucket: stsDataFull.bucketname,
        endpoint: stsDataFull.region + ".aliyuncs.com", // OSS endpoint
        id: stsDataFull.file_id // 通义千问文件ID
      };

      if (!credentials.access_key_id || !credentials.access_key_secret || !credentials.security_token ||
          !fileInfo.url || !fileInfo.path || !fileInfo.bucket) {
        console.error("[!] 从API响应中提取凭证或文件信息失败。响应数据:", stsDataFull);
        throw new Error("获取到的STS凭证或文件信息不完整。");
      }
      return { credentials, file_info: fileInfo };
    } else {
      console.error(`[!] 获取STS Token失败。状态码: ${response.status}, 响应:`, response.data);
      throw new Error(`获取STS Token失败，状态码: ${response.status}`);
    }
  } catch (error) {
    console.error("[!] 请求或处理STS Token时发生错误:", error.response ? error.response.data : error.message);
    if (error.response && error.response.status === 403) {
        console.error("[!] 收到 403 Forbidden 错误。可能需要检查请求头或Token权限。");
    }
    throw error;
  }
}

/**
 * 使用STS凭证将文件Buffer上传到阿里云OSS。
 * @param {Buffer} fileBuffer - 文件内容的Buffer。
 * @param {object} stsCredentials - STS凭证 (access_key_id, access_key_secret, security_token)。
 * @param {object} ossInfo - OSS信息 (bucket, path, endpoint)。
 * @param {string} fileContentTypeFull - 文件的完整MIME类型。
 * @returns {Promise<void>}
 * @throws {Error} 如果上传失败。
 */
async function uploadToOssWithSts(fileBuffer, stsCredentials, ossInfo, fileContentTypeFull) {

  try {
    const client = new OSS({
      accessKeyId: stsCredentials.access_key_id,
      accessKeySecret: stsCredentials.access_key_secret,
      stsToken: stsCredentials.security_token,
      bucket: ossInfo.bucket,
      endpoint: ossInfo.endpoint,
      secure: true, // 始终使用 HTTPS
    });

    const result = await client.put(ossInfo.path, fileBuffer, {
      headers: { 'Content-Type': fileContentTypeFull }
    });

    if (result.res.status === 200) {
      // console.log(`[+] 文件已成功上传到OSS。ETag: ${result.etag}`);
    } else {
      console.error(`[!] ali-oss 上传文件失败，HTTP状态码: ${result.res.status}`, result);
      throw new Error(`ali-oss 上传失败，状态码: ${result.res.status}`);
    }
  } catch (error) {
    console.error("[!] 使用 ali-oss 上传到OSS时发生错误:", error);
    throw error;
  }
}

/**
 * 完整的文件上传流程：获取STS Token -> 上传到OSS。
 * @param {Buffer} fileBuffer - 图片文件的Buffer。
 * @param {string} originalFilename - 原始文件名 (例如 "image.png")。
 * @param {string} qwenAuthToken - 通义千问认证Token (纯token，不含Bearer)。
 * @returns {Promise<{file_url: string, file_id: string, message: string}>} 包含上传后的URL、文件ID和成功消息。
 * @throws {Error} 如果任何步骤失败。
 */
async function uploadFileToQwenOss(fileBuffer, originalFilename, qwenAuthToken) {
  const filesize = fileBuffer.length;
  const mimeType = mimetypes.lookup(originalFilename) || 'application/octet-stream'
  const filetypeSimple = getSimpleFileType(mimeType)

  // console.log(`[*] 开始上传文件: ${originalFilename}, 大小: ${filesize}, 类型: ${mimeType}, 简化类型: ${filetypeSimple}`)

  if (!qwenAuthToken) {
    throw new Error("通义千问认证Token (qwenAuthToken) 未提供。")
  }

  // 1. 请求STS Token
  const stsData = await requestStsToken(originalFilename, filesize, filetypeSimple, qwenAuthToken)
  const { credentials, file_info } = stsData

  // 2. 上传到OSS
  await uploadToOssWithSts(fileBuffer, credentials, file_info, mimeType)

  // console.log(`[成功] 文件上传流程完成。CDN URL: ${file_info.url}`)
  return {
    file_url: file_info.url,
    file_id: file_info.id,
    status: 200
  }
}

module.exports = {
  uploadFileToQwenOss
}
