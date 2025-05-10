// router/chat.js
/**
 * 处理聊天完成请求 (/v1/chat/completions)
 * 支持两种请求类型:
 * 1. application/json: 遵循 OpenAI 格式，图片以 Base64 Data URI 形式在 messages 中提供。
 * 服务器会自动处理 Base64 上传并替换 URL。
 * 2. multipart/form-data: 包含文本字段 ('messages' JSON 字符串) 和可选的图片文件 ('file')。
 * 服务器会处理上传的文件。
 *
 * 最终都会将包含图片 URL (如果提供) 和文本的消息发送给通义千问 API。
 */
const express = require('express');
const router = express.Router();
const uuid = require('uuid');
const multer = require('multer'); // 用于处理 multipart/form-data
const { isJson } = require('../lib/tools.js');
const { sendChatRequest } = require('../lib/request.js');
const accountManager = require('../lib/account.js');
const config = require('../config.js');
const { apiKeyVerify } = require('../router/index.js');
const { uploadFileToQwenOss } = require('../lib/qwen_file_uploader');
const { Buffer } = require('buffer');
const { TextDecoder } = require('util');
const mimetypes = require('mime-types'); // 用于从 Data URI 获取类型

// 配置 Multer 使用内存存储，仅用于 multipart 请求
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 限制文件大小, 例如 10MB
});

/**
 * 检查模型是否启用了思考模式。
 * @param {string} model - 模型名称。
 * @param {boolean|string} enable_thinking - 是否强制启用思考。
 * @param {number|string} thinking_budget - 思考预算。
 * @returns {object} 思考配置对象。
 */
const isThinkingEnabled = (model, enable_thinking, thinking_budget) => {
  const thinking_config = {
    "output_schema": "phase",
    "thinking_enabled": false,
    "thinking_budget": 38912 // 默认预算值
  };
  // 检查模型名称或参数是否明确启用思考
  if ((model && model.includes('-thinking')) || enable_thinking === true || String(enable_thinking).toLowerCase() === 'true') {
    thinking_config.thinking_enabled = true;
  }
  // 检查并设置有效的思考预算
  if (thinking_budget && !isNaN(Number(thinking_budget)) && Number(thinking_budget) > 0 && Number(thinking_budget) < 38912) {
    thinking_config.budget = Number(thinking_budget);
  }
  return thinking_config;
};

/**
 * 解析并清理模型名称，移除特定后缀。
 * @param {string} model - 原始模型名称。
 * @returns {string} 清理后的模型名称。
 */
const parserModel = (model) => {
  if (!model) return 'qwen-turbo'; // 提供一个合理的默认模型
  try {
    let parsed = String(model);
    // 移除行为控制后缀，保留能力标识后缀
    parsed = parsed.replace(/-search/g, '');
    parsed = parsed.replace(/-thinking/g, '');
    return parsed;
  } catch (e) {
    console.error("解析模型名称失败:", e);
    return 'qwen-turbo'; // 出错时回退
  }
};

/**
 * 处理流式响应，将 Qwen API 的 SSE 流转发给客户端。
 * @param {object} res - Express 响应对象。
 * @param {ReadableStream} responseStream - 从通义千问 API 获取的响应流。
 * @param {boolean} enable_thinking - 是否启用了思考输出。
 * @param {boolean} enable_web_search - 是否启用了网页搜索。
 */
const streamResponse = async (res, responseStream, enable_thinking, enable_web_search) => {
  try {
    const message_id = uuid.v4();
    const decoder = new TextDecoder('utf-8');
    let web_search_info = null;
    let thinking_start = false;
    let thinking_end = false;

    responseStream.on('data', async (chunk) => {
      // 确保响应流仍然可写
      if (!res.writable || res.writableEnded) {
        console.warn("[警告] 尝试写入已结束的响应流。");
        if (responseStream && typeof responseStream.destroy === 'function') responseStream.destroy(); // 停止读取源流
        return;
      }
      const decodeText = decoder.decode(chunk, { stream: true });
      const lists = decodeText.split('\n').filter(item => item.trim() !== ''); // 分割可能的多条消息

      for (const item of lists) {
        if (!res.writable || res.writableEnded) break; // 再次检查流状态

        if (item.trim() === 'data: [DONE]') {
          // 如果禁用了思考输出，且有搜索结果，在这里附加搜索结果
          if ((config.outThink === false || !enable_thinking) && web_search_info && !thinking_start) {
            try {
              const webSearchTable = await accountManager.generateMarkdownTable(web_search_info, config.searchInfoMode || "text");
              const searchStreamTemplate = { id: `chatcmpl-${message_id}-search`, object: "chat.completion.chunk", created: Date.now(), choices: [{ index: 0, delta: { content: `\n\n---\n${webSearchTable}` }, finish_reason: null }] };
              res.write(`data: ${JSON.stringify(searchStreamTemplate)}\n\n`);
            } catch (tableError) {
              console.error("生成搜索结果 Markdown 表失败:", tableError);
            }
          }
          res.write(`data: [DONE]\n\n`); // 发送最终的 [DONE] 标记
          if (!res.writableEnded) res.end();
          return; // 处理完 DONE 后退出循环
        }

        try {
          const jsonData = item.replace(/^data: /, '');
          if (!jsonData) continue; // 避免空字符串导致 JSON.parse 错误
          const decodeJson = isJson(jsonData) ? JSON.parse(jsonData) : null;
          if (!decodeJson) continue; // 如果不是有效 JSON，跳过

          // 提取 web_search 信息
          if (decodeJson.choices && decodeJson.choices[0]?.delta?.name === 'web_search' && decodeJson.choices[0]?.delta?.extra) {
            web_search_info = decodeJson.choices[0].delta.extra.web_search_info;
          }

          let content = decodeJson.choices?.[0]?.delta?.content ?? '';
          const phase = decodeJson.choices?.[0]?.delta?.phase;

          // 处理思考标签 (如果启用)
          if (enable_thinking && config.outThink) {
            if (phase === 'think' && !thinking_start) {
              thinking_start = true;
              let prefix = "<think>\n\n";
              if (web_search_info) {
                try {
                  prefix += `${await accountManager.generateMarkdownTable(web_search_info, config.searchInfoMode)}\n\n`;
                } catch (tableError) {
                  console.error("生成搜索结果 Markdown 表失败 (思考模式):", tableError);
                }
              }
              content = prefix + content;
            }
            if (phase === 'answer' && thinking_start && !thinking_end) {
              thinking_end = true;
              content = `\n\n</think>\n` + content;
            }
          }

          const StreamTemplate = {
            id: decodeJson.id || `chatcmpl-${message_id}`,
            object: decodeJson.object || "chat.completion.chunk",
            created: decodeJson.created || Date.now(),
            model: decodeJson.model || "",
            choices: [{
              index: 0,
              delta: { content: content },
              finish_reason: (decodeJson.choices && decodeJson.choices[0] ? decodeJson.choices[0].finish_reason : null) ?? null
            }],
            usage: decodeJson.usage || null
          };
          if (decodeJson.choices?.[0]?.delta?.role) { // 如果 delta 中包含 role，也添加到响应中
            StreamTemplate.choices[0].delta.role = decodeJson.choices[0].delta.role;
          }

          res.write(`data: ${JSON.stringify(StreamTemplate)}\n\n`);
        } catch (error) {
          console.error('解析或处理流数据块时出错:', item, error);
        }
      }
    });

    responseStream.on('error', (err) => {
      console.error('源响应流发生错误:', err);
      if (res.writable && !res.writableEnded) {
        try {
          const errorChunk = { id: `chatcmpl-${message_id}-error`, object: "chat.completion.chunk", created: Date.now(), choices: [{ index: 0, delta: { content: `\n\n[服务流错误: ${err.message}]` }, finish_reason: "error" }] };
          res.write(`data: ${JSON.stringify(errorChunk)}\n\n`);
          res.write(`data: [DONE]\n\n`);
        } catch (writeError) {
            console.error("写入流错误信息失败:", writeError);
        } finally {
            if (!res.writableEnded) res.end();
        }
      } else if (!res.headersSent) {
         try { // 如果头部未发送，可以尝试发送 JSON 错误
             res.status(500).json({ error: `服务流错误: ${err.message}` });
         } catch (jsonError) {
             console.error("发送 JSON 错误响应失败:", jsonError);
         }
      }
    });

    responseStream.on('end', async () => {
      console.log('源响应流已结束。');
      if (res.writable && !res.writableEnded) {
          // 检查是否需要在结束时附加搜索结果
          if ((config.outThink === false || !enable_thinking) && web_search_info && !thinking_start) {
              try {
                const webSearchTable = await accountManager.generateMarkdownTable(web_search_info, config.searchInfoMode || "text");
                const searchStreamTemplate = { id: `chatcmpl-${message_id}-search-end`, object: "chat.completion.chunk", created: Date.now(), choices: [{ index: 0, delta: { content: `\n\n---\n${webSearchTable}` }, finish_reason: null }] };
                res.write(`data: ${JSON.stringify(searchStreamTemplate)}\n\n`);
              } catch (tableError) {
                  console.error("结束时生成搜索结果 Markdown 表失败:", tableError);
              }
          }
          res.write(`data: [DONE]\n\n`); // 确保最终的 DONE 标记
          res.end();
      }
    });

  } catch (error) {
    console.error('处理流式响应时发生顶层错误:', error);
    if (res.writable && !res.writableEnded) {
        try {
            res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: `\n[处理流响应错误: ${error.message}]`}}]})}\n\n`);
            res.write(`data: [DONE]\n\n`);
        } catch (writeError) {
            console.error("写入顶层错误到流失败:", writeError);
        } finally {
            if (!res.writableEnded) res.end();
        }
    } else if (!res.headersSent) {
        try {
            res.status(500).json({ error: `处理流式响应时发生严重错误: ${error.message}` });
        } catch (jsonError) {
            console.error("发送顶层 JSON 错误响应失败:", jsonError);
        }
    }
  }
};

/**
 * 处理非流式响应，将 Qwen API 的 JSON 响应格式化后返回给客户端。
 * @param {object} res - Express 响应对象。
 * @param {object} qwenResponse - 从通义千问 API 获取的完整 JSON 响应。
 * @param {boolean} enable_thinking - 是否启用了思考输出。
 * @param {boolean} enable_web_search - 是否启用了网页搜索。
 * @param {string} model - 使用的模型名称。
 */
const notStreamResponse = async (res, qwenResponse, enable_thinking, enable_web_search, model) => {
  try {
    // 增加对 qwenResponse 结构的健壮性检查
    if (!qwenResponse?.choices?.[0]?.message) {
        console.error("无效的 Qwen 非流式响应结构:", qwenResponse);
        if (!res.headersSent) { // 避免在已发送响应头后再次发送
            return res.status(500).json({ error: "收到来自 Qwen API 的无效响应。" });
        }
        return; // 如果已发送，则无法再响应
    }

    let finalContent = qwenResponse.choices[0].message.content || "";
    let web_search_info = qwenResponse.choices[0].message.extra?.web_search_info;

    // 如果不输出思考过程，但有搜索结果，则附加搜索结果
    if ((config.outThink === false || !enable_thinking) && web_search_info) {
        try {
            const webSearchTable = await accountManager.generateMarkdownTable(web_search_info, config.searchInfoMode || "text");
            finalContent += `\n\n---\n${webSearchTable}`;
        } catch (tableError) {
            console.error("非流式响应中生成搜索结果 Markdown 表失败:", tableError);
            // 可以选择附加原始 web_search_info 或错误提示
            finalContent += `\n\n---\n[无法格式化搜索结果]`;
        }
    }

    // 构建 OpenAI 兼容的响应体
    const responseBody = {
      id: qwenResponse.id || `chatcmpl-${uuid.v4()}`,
      object: qwenResponse.object || "chat.completion",
      created: qwenResponse.created || Math.floor(Date.now() / 1000),
      model: model,
      choices: [{
        index: 0,
        message: {
          role: "assistant",
          content: finalContent
        },
        finish_reason: qwenResponse.choices[0].finish_reason || "stop"
      }],
      usage: qwenResponse.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    };
    if (!res.headersSent) { // 确保在发送前头部未被发送
        res.json(responseBody);
    } else {
        console.error("无法发送非流式响应，因为头部已发送。");
    }
  } catch (error) {
    console.error('处理非流式响应时发生错误:', error, "原始Qwen响应:", qwenResponse);
    if (!res.headersSent) {
        res.status(500).json({ error: "处理响应时发生内部错误。" });
    }
  }
};


/**
 * POST /v1/chat/completions
 * 核心路由处理器：根据 Content-Type 处理 application/json 或 multipart/form-data 请求。
 */
router.post(
  `${config.apiPrefix ? config.apiPrefix : ''}/v1/chat/completions`,
  apiKeyVerify, // 验证 API Key
  // upload.fields 仅在 Content-Type 是 multipart/form-data 时生效
  upload.fields([ { name: 'file', maxCount: 1 } ]),
  async (req, res) => {
    let setResHeaderStatus = false;
    // 函数：安全地设置响应头 (流式或 JSON)
    const setResHeader = (isStream) => {
        if (setResHeaderStatus || res.headersSent) return; // 防止重复设置或在发送后设置
        try {
          res.set(isStream
            ? { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' }
            : { 'Content-Type': 'application/json; charset=utf-8' });
          setResHeaderStatus = true;
        } catch (e) { console.error("设置响应头失败:", e); }
    };

    try {
      // 1. 提取请求数据 (区分 JSON 和 Multipart)
      let model, messagesData, streamStr, search, enable_thinking, thinking_budget, session_id, chat_id;
      let uploadedFile = null;
      let isMultipart = false;

      if (req.is('multipart/form-data')) {
          console.log("[信息] 收到 multipart/form-data 请求。");
          isMultipart = true;
          ({ model, messages: messagesData, stream: streamStr, search, enable_thinking, thinking_budget, session_id, chat_id } = req.body);
          uploadedFile = req.files?.file?.[0];
      } else if (req.is('application/json')) {
          console.log("[信息] 收到 application/json 请求。");
          ({ model, messages: messagesData, stream: streamStr, search, enable_thinking, thinking_budget, session_id, chat_id } = req.body);
      } else {
          return res.status(415).json({ error: '不支持的 Content-Type。请使用 application/json 或 multipart/form-data。' });
      }

      // 2. 解析 messages (处理字符串或对象数组)
      let messages;
      try {
        if (isMultipart) {
            if (typeof messagesData !== 'string' || messagesData.trim() === '') { throw new Error("multipart 请求中缺少 'messages' 字段或其值为空字符串。"); }
            messages = JSON.parse(messagesData);
        } else {
            if (!Array.isArray(messagesData)) { throw new Error("application/json 请求中 'messages' 字段必须是数组。"); }
            messages = messagesData;
        }
        if (!Array.isArray(messages) || messages.length === 0 || !messages[0]?.role || messages[0]?.content === undefined) {
             throw new Error("解析后的 messages 格式无效或内容缺失。");
        }
      } catch (e) {
        console.error("解析 messages 失败:", e.message, "收到的字段内容:", messagesData);
        if (!res.headersSent) { return res.status(400).json({ error: `解析 messages 失败: ${e.message}` }); }
        else { console.error("无法发送400错误，头部已发送。"); if (res.writable && !res.writableEnded) res.end(); return; }
      }

      // 3. 处理其他参数
      const stream = String(streamStr).toLowerCase() === 'true';
      const parsedModel = parserModel(model);
      const hasImage = uploadedFile || messages.some(msg =>
          msg.role === 'user' && Array.isArray(msg.content) &&
          msg.content.some(item =>
              (item.type === 'image_url' && item.image_url?.url?.startsWith('data:image')) ||
              (item.type === 'image' && typeof item.image === 'string' && item.image.startsWith('data:image'))
          )
      );
      const baseChatType = hasImage ? 'vision' : ((parsedModel && parsedModel.includes('-search')) || search ? 'search' : 't2t');
      const thinkingConfig = isThinkingEnabled(parsedModel, enable_thinking, thinking_budget);
      const enable_thinking_flag = thinkingConfig.thinking_enabled;
      const enable_web_search_flag = baseChatType === 'search';

      let imageUrl = null;
      let qwenAuthToken = null;

      // 4. 处理图片上传 (区分文件和 Base64)
      if (uploadedFile) { // 处理 multipart 上传的文件
        console.log(`[信息] 处理上传的文件: ${uploadedFile.originalname}`);
        qwenAuthToken = accountManager.getAccountToken();
        if (!qwenAuthToken) { throw new Error('无法获取内部认证Token进行文件上传。'); }
        try {
          const uploadResult = await uploadFileToQwenOss(uploadedFile.buffer, uploadedFile.originalname, qwenAuthToken);
          imageUrl = uploadResult.file_url;
          console.log(`[+] 文件上传成功，URL: ${imageUrl}`);
        } catch (uploadError) { throw new Error(`处理文件上传失败: ${uploadError.message || '未知上传错误'}`); }

      } else { // 检查 application/json 请求中的 Base64
        for (let i = 0; i < messages.length; i++) {
          const msg = messages[i];
          if (msg.role === 'user' && Array.isArray(msg.content)) {
            for (let j = 0; j < msg.content.length; j++) {
              const item = msg.content[j];
              let base64Uri = null;
              if (item.type === 'image_url' && item.image_url?.url?.startsWith('data:image')) {
                  base64Uri = item.image_url.url;
              } else if (item.type === 'image' && typeof item.image === 'string' && item.image.startsWith('data:image')) {
                  // 支持直接在 image 字段放 Base64 URI (非标准，为增加兼容性)
                  base64Uri = item.image;
              }

              if (base64Uri) {
                console.log("[信息] 检测到 Base64 图片数据，开始处理上传...");
                if (!qwenAuthToken) qwenAuthToken = accountManager.getAccountToken();
                if (!qwenAuthToken) { throw new Error('无法获取内部认证Token进行 Base64 上传。'); }
                try {
                  const matches = base64Uri.match(/^data:(image\/.*?);base64,(.*)$/);
                  if (!matches || matches.length !== 3) { throw new Error('无效的 Base64 Data URI 格式。'); }
                  const mimeType = matches[1];
                  const base64Data = matches[2];
                  const fileBuffer = Buffer.from(base64Data, 'base64');
                  const fileExtension = mimetypes.extension(mimeType) || 'png';
                  const originalFilename = `image_from_base64_${Date.now()}.${fileExtension}`;

                  const uploadResult = await uploadFileToQwenOss(fileBuffer, originalFilename, qwenAuthToken);
                  imageUrl = uploadResult.file_url;
                  console.log(`[+] Base64 图片上传成功，URL: ${imageUrl}`);
                  // 将 Base64 替换为 URL，并统一格式为 Qwen 的 image 类型
                  messages[i].content[j] = { type: "image", image: imageUrl };
                  break; // 只处理找到的第一个 Base64 图片 (根据需求)
                } catch (uploadError) { throw new Error(`处理 Base64 图片上传失败: ${uploadError.message || '未知上传错误'}`); }
              }
            }
          }
          if (imageUrl) break; // 如果已找到并处理 Base64，跳出外层循环 (因为只支持一张图片)
        }
      }

      // 5. 构建最终的 messages 数组 (确保 content 是数组，转换 image_url)
      messages = messages.map(msg => {
           if (typeof msg.content === 'string') {
               msg.content = [{ type: "text", text: msg.content }];
           } else if (!Array.isArray(msg.content) && msg.content != null) {
               console.warn("[警告] 消息 content 格式非预期，尝试包装:", msg.content);
               msg.content = [{ type: "text", text: String(msg.content) }];
           } else if (Array.isArray(msg.content)) {
               // 转换 OpenAI 的 image_url (如果不是 Base64 且未被替换) 为 Qwen 的 image 格式
               msg.content = msg.content.map(item => {
                   if (item.type === 'image_url' && item.image_url?.url && !item.image_url.url.startsWith('data:image')) {
                       return { type: "image", image: item.image_url.url };
                   }
                   if (item.type === 'text' && item.text === undefined) {
                       item.text = ''; // 确保 text 类型有 text 字段
                   }
                   if (item.type === 'image' && item.image === undefined) {
                       // 如果 image 字段缺失，可能需要移除此项或报错
                       console.warn("[警告] 发现 type 为 image 但缺少 image 字段的项目:", item);
                       return null; // 标记为 null，稍后过滤
                   }
                   return item;
               }).filter(item => item !== null); // 过滤掉无效项
           }
           return msg;
       });
      // 如果有上传的文件但 messages 结构不适合插入，创建新消息
      if (imageUrl && !(messages.length > 0 && messages[0].role === 'user' && Array.isArray(messages[0].content))) {
          console.warn("[警告] 收到图片但无法添加到现有 messages 结构中，创建新的用户消息。");
          messages.push({ role: "user", content: [ {type: "image", image: imageUrl} ] });
      }


      // 6. 构建发送给 Qwen API 的请求体
      const bodyToQwen = { stream: stream, incremental_output: true, model: parsedModel, messages: messages, session_id: session_id || uuid.v4(), chat_id: chat_id || uuid.v4(), id: uuid.v4(), chat_type: baseChatType, sub_chat_type: baseChatType, chat_mode: "normal" };
      if (messages.length > 0) { const lastMsgIndex = messages.length - 1; messages[lastMsgIndex].feature_config = { ...(messages[lastMsgIndex].feature_config || {}), ...thinkingConfig }; messages[lastMsgIndex].chat_type = baseChatType; }
      if (baseChatType === 'vision' && !parsedModel.toLowerCase().includes('vl')) { console.warn(`[!] 警告: 消息中包含图片，但选择的模型 '${parsedModel}' 可能不是视觉模型。`); }

      // 7. 发送请求到 Qwen API
      const qwenApiResponse = await sendChatRequest(bodyToQwen);

      // 8. 处理 Qwen API 的响应
      if (qwenApiResponse.status !== 200 || qwenApiResponse.error) {
        console.error("请求通义千问API失败或返回错误:", qwenApiResponse.error || `状态码: ${qwenApiResponse.status}`);
        const errorDetail = qwenApiResponse.error ? (qwenApiResponse.error.message || JSON.stringify(qwenApiResponse.error)) : `请求通义千问API失败，状态码: ${qwenApiResponse.status}`;
        setResHeader(stream);
        if (stream && res.writable && !res.writableEnded) { const errorChunk = { id: `chatcmpl-${uuid.v4()}-apierror`, object: "chat.completion.chunk", created: Date.now(), choices: [{ index: 0, delta: { content: `\n\n[API请求错误: ${errorDetail}]` }, finish_reason: "error" }] }; res.write(`data: ${JSON.stringify(errorChunk)}\n\n`); res.write(`data: [DONE]\n\n`); if (!res.writableEnded) res.end(); }
        else { if (!res.headersSent) { res.status(qwenApiResponse.status || 500).json({ error: errorDetail }); } else { console.error("无法发送JSON错误响应，头部已发送。"); if (!res.writableEnded) res.end(); } }
        return;
      }

      // 9. 发送成功响应
      setResHeader(stream);
      if (stream) {
        streamResponse(res, qwenApiResponse.response, enable_thinking_flag, enable_web_search_flag);
      } else {
        notStreamResponse(res, qwenApiResponse.response, enable_thinking_flag, enable_web_search_flag, parsedModel);
      }

    } catch (error) { // 捕获顶层错误
      console.error("处理聊天请求时发生未知严重错误 (router.post catch):", error);
      // 安全地尝试发送错误响应给客户端
      if (!res.headersSent) {
        try { res.status(500).json({ error: `处理聊天请求时发生未知严重错误: ${error.message}` }); }
        catch (e) { console.error("发送顶层错误响应失败:", e); }
      } else if (res.writable && !res.writableEnded) {
        try { const errorChunk = { id: `chatcmpl-${uuid.v4()}-internalerror`, object: "chat.completion.chunk", created: Date.now(), choices: [{ index: 0, delta: { content: `\n\n[内部服务器错误: ${error.message}]` }, finish_reason: "error" }] }; res.write(`data: ${JSON.stringify(errorChunk)}\n\n`); res.write(`data: [DONE]\n\n`); } catch (streamError) { console.error("写入内部错误到流失败:", streamError); }
        finally { if (!res.writableEnded) res.end(); }
      } else { console.error("无法向客户端发送内部错误响应。"); }
    }
  }
);

module.exports = router;
