const ModelsMap = require('../models/models-map.js')

/**
 * 模型工具函数
 * 基于 models-map.js 提供模型相关的实用功能
 */

/**
 * 模型变体后缀
 */
const MODEL_VARIANTS = [
  '',
  '-thinking',
  '-search',
  '-thinking-search'
]

/**
 * 获取基础模型列表
 * @returns {Array<string>} 基础模型列表
 */
function getBaseModels() {
  return Object.keys(ModelsMap)
}

/**
 * 生成完整的模型列表（包含所有变体）
 * @returns {Array<string>} 完整模型列表
 */
function generateFullModelList() {
  const baseModels = getBaseModels()
  const fullList = []
  
  baseModels.forEach(baseModel => {
    MODEL_VARIANTS.forEach(variant => {
      fullList.push(baseModel + variant)
    })
  })
  
  return fullList
}

/**
 * 生成符合 OpenAI API 格式的模型列表
 * @returns {Object} OpenAI API 格式的模型列表
 */
function generateApiModelList() {
  const modelList = generateFullModelList()
  const currentTime = Math.floor(Date.now() / 1000)
  
  return {
    object: 'list',
    data: modelList.map(modelId => ({
      id: modelId,
      object: 'model',
      created: currentTime,
      owned_by: 'qwen'
    }))
  }
}



module.exports = {
  getBaseModels,
  generateFullModelList,
  generateApiModelList,
  MODEL_VARIANTS
}
