const ModelsMap = require('../models/ModelsMap.js')

const handleGetModels = async (req, res) => {
  const models = []

  for (const model in ModelsMap) {
    const modelData = {
      "id": model,
      "name": model,
      "object": "model",
      "owned_by": "openai",
      ...ModelsMap[model],
      "updated_at": new Date().getTime() / 1000,
      "created_at": new Date().getTime() / 1000
    }
    const isThinking = ModelsMap[model].abilities.thinking
    const isSearch = ModelsMap[model].chat_type.includes('search')

    models.push(modelData)

    if (isThinking) {
      const newModelData = JSON.parse(JSON.stringify(modelData))
      newModelData.id = `${modelData.id}-thinking`
      newModelData.name = `${modelData.name}-thinking`
      models.push(newModelData)
    }

    if (isSearch) {
      const newModelData = JSON.parse(JSON.stringify(modelData))
      newModelData.id = `${modelData.id}-search`
      newModelData.name = `${modelData.name}-search`
      models.push(newModelData)
    }

    if (isThinking && isSearch) {
      const newModelData = JSON.parse(JSON.stringify(modelData))
      newModelData.id = `${modelData.id}-thinking-search`
      newModelData.name = `${modelData.name}-thinking-search`
      models.push(newModelData)
    }

  }
  res.json({
    "object": "list",
    "data": models
  })
}

module.exports = {
  handleGetModels
}