// lib/request.js
const axios = require('axios');
const uuid = require('uuid');
const accountManager = require('./account.js');
const { sleep } = require('./tools.js');

const sendChatRequest = async (body) => {
  // 确保 accountManager 存在且 getModels 是一个函数
  if (accountManager && typeof accountManager.getModels === 'function') {
    try {
      const models = await accountManager.getModels();
      if (models && !models.includes(body.model)) {
        console.warn(`[警告] 模型 ${body.model} 不在已知模型列表中，将使用默认模型 qwen-turbo。`);
        body.model = 'qwen-turbo';
      }
    } catch (modelsError) {
      console.error("[错误] 获取模型列表失败:", modelsError);
      body.model = body.model || 'qwen-turbo'; // Fallback if model list fetch fails
    }
  } else {
    console.warn("[警告] accountManager 或 getModels 方法未定义，无法验证模型。将使用请求中指定的模型或默认模型。");
    body.model = body.model || 'qwen-turbo'; // Fallback if accountManager is not set up
  }

  try {
    // console.log("发送到 Qwen API 的请求体:", JSON.stringify(body, null, 2)); // Sensitive data, remove for production
    const response = await axios.post('https://chat.qwen.ai/api/chat/completions',
      body,
      {
        headers: accountManager.getHeaders(),
        responseType: body.stream ? 'stream' : 'json',
        timeout: body.stream ? 120000 : 60000 // Longer timeout for streams
      }
    );

    return {
      status: response.status,
      response: response.data
    };
  } catch (error) {
    let statusCode = 500;
    let errorMessage = "与通义千问服务通信时发生未知错误。";
    let errorCode = null; // For specific error codes like EAI_AGAIN
    let qwenErrorData = null;

    if (axios.isAxiosError(error)) {
      console.error("Axios 请求通义千问API失败:");
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        statusCode = error.response.status;
        qwenErrorData = error.response.data;
        errorMessage = (qwenErrorData && qwenErrorData.message) ? qwenErrorData.message : `通义千问服务返回错误: ${statusCode}`;
        console.error(`  状态码: ${statusCode}`);
        console.error(`  响应数据:`, JSON.stringify(qwenErrorData, null, 2));
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage = "通义千问服务未响应或网络连接错误。";
        console.error(`  无响应: ${errorMessage}`);
        if (error.code) { // E.g., ECONNABORTED, ENOTFOUND, EAI_AGAIN
            errorCode = error.code;
            errorMessage += ` (错误码: ${errorCode})`;
            console.error(`  错误码: ${errorCode}`);
            // Set more specific HTTP status codes for the client based on network error codes
            if (errorCode === 'ECONNABORTED') statusCode = 504; // Gateway Timeout
            else if (errorCode === 'ENOTFOUND' || errorCode === 'EAI_AGAIN') statusCode = 503; // Service Unavailable (DNS issue)
            else statusCode = 503; // Service Unavailable (Other network issues)
        }
      } else {
        // Something happened in setting up the request that triggered an Error
        errorMessage = `设置通义千问请求时出错: ${error.message}`;
        console.error(`  请求设置错误: ${error.message}`);
      }
    } else {
      // Non-Axios error
      console.error("发送请求到通义千问前发生非Axios错误:", error);
      errorMessage = error.message || "处理请求时发生内部错误。";
    }

    // Retry logic for specific status codes (e.g., 429 Too Many Requests)
    if (statusCode === 429) {
      console.log(`[信息] 收到 429 Too Many Requests，将在1秒后重试...`);
      await sleep(1000); // Ensure sleep is defined and works as expected
      return sendChatRequest(body); // Recursive call for retry
    }

    return {
      status: statusCode,
      error: {
        message: errorMessage,
        code: errorCode,
        qwen_response: qwenErrorData,
        // request_body: body // Including request_body can expose sensitive data, use with caution
      },
      response: null
    };
  }
};

module.exports = {
  sendChatRequest
};
