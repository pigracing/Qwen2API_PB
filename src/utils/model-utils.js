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

/**
 * 检查模型是否存在
 * @param {string} modelId - 模型ID
 * @returns {boolean} 模型是否存在
 */
function isModelExists(modelId) {
  const fullList = generateFullModelList()
  return fullList.includes(modelId)
}

/**
 * 解析模型ID，提取基础模型和变体
 * @param {string} modelId - 模型ID
 * @returns {Object} {baseModel: string, variants: Array<string>}
 */
function parseModelId(modelId) {
  if (!modelId || typeof modelId !== 'string') {
    return { baseModel: null, variants: [] }
  }

  let baseModel = modelId
  const variants = []

  // 检查并移除变体后缀
  if (modelId.includes('-thinking-search')) {
    variants.push('thinking', 'search')
    baseModel = modelId.replace('-thinking-search', '')
  } else if (modelId.includes('-thinking')) {
    variants.push('thinking')
    baseModel = modelId.replace('-thinking', '')
  } else if (modelId.includes('-search')) {
    variants.push('search')
    baseModel = modelId.replace('-search', '')
  } else if (modelId.includes('-draw')) {
    variants.push('draw')
    baseModel = modelId.replace('-draw', '')
  }

  return { baseModel, variants }
}

/**
 * 获取模型的详细信息
 * @param {string} modelId - 模型ID
 * @returns {Object|null} 模型详细信息或null
 */
function getModelInfo(modelId) {
  const { baseModel } = parseModelId(modelId)
  return ModelsMap[baseModel] || null
}

/**
 * 获取模型统计信息
 * @returns {Object} 统计信息
 */
function getModelStats() {
  const baseCount = getBaseModels().length
  const variantCount = MODEL_VARIANTS.length
  const totalCount = baseCount * variantCount

  return {
    baseModels: baseCount,
    variants: variantCount,
    totalModels: totalCount,
    modelVariants: [...MODEL_VARIANTS]
  }
}

module.exports = {
  getBaseModels,
  generateFullModelList,
  generateApiModelList,
  isModelExists,
  parseModelId,
  getModelInfo,
  getModelStats,
  MODEL_VARIANTS
}
