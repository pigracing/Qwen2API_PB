const axios = require('axios')
const FormData = require('form-data')
const authManager = require('./account')

async function uploadImage(base64Image, authToken) {
  try {
    if (!authToken || !base64Image) {
      return false
    }

    let contentType = 'image/png'
    let filename = 'image.png'
    
    // 处理包含 MIME 类型的 base64 字符串
    let base64Data
    if (base64Image.startsWith('data:')) {
      // 从 data URL 中提取 MIME 类型和数据
      const matches = base64Image.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)
      if (matches && matches.length === 3) {
        contentType = matches[1]
        base64Data = matches[2]
        
        // 根据 MIME 类型设置文件扩展名
        const extension = contentType.split('/')[1]
        filename = `image.${extension}`
      } else {
        // 格式不正确，使用默认值
        base64Data = base64Image.split(',')[1]
      }
    } else {
      // 没有 MIME 前缀，假设为 PNG
      base64Data = base64Image
    }
    
    // 将 base64 转换为 Buffer
    const buffer = Buffer.from(base64Data, 'base64')
    
    const formData = new FormData()
    formData.append('file', buffer, {
      filename: filename,
      contentType: contentType
    })

    const uploadResponse = await axios.post('https://chat.qwenlm.ai/api/v1/files/', formData, {
      headers: {
        ...authManager.getHeaders(authToken),
        ...formData.getHeaders()
      }
    })

    if (uploadResponse.status !== 200) {
      return false
    }
    
    // console.log('上传成功:', uploadResponse.data)
    return uploadResponse.data.id

  } catch (error) {
    // console.error('上传错误:', error.message)
    return false
  }
}

module.exports = {
  uploadImage
}