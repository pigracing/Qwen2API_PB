const axios = require('axios')
const FormData = require('form-data')
const authManager = require('./account')

async function uploadImage(base64Image, authToken) {
  try {
    if (!authToken || !base64Image) {
      return false
    }
    
    const base64Data = base64Image.split('base64,')[1]
    // console.log(base64Data.slice(0, 100))
    
    // 将 base64 转换为 Buffer
    const buffer = Buffer.from(base64Data, 'base64')
    
    const formData = new FormData()
    formData.append('file', buffer, {
      filename: "image.png",
      contentType: "image/png"
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
    console.error('上传错误:', error)
    return false
  }
}

module.exports = {
  uploadImage
}