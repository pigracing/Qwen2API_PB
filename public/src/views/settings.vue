<template>
  <div class="w-full min-h-screen p-4">
    <div class="container mx-auto">
      <div class="flex flex-col md:flex-row justify-between items-center mb-6 px-4 space-y-4 md:space-y-0 pt-5">
        <h1 class="text-3xl font-bold">系统设置</h1>
        <router-link to="/"
          class="action-button font-bold border border-blue-200 bg-blue-50 text-blue-900 px-4 py-2 rounded-xl shadow-sm hover:bg-blue-100 hover:border-blue-400 transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 text-center">
          返回Token管理
        </router-link>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
        <!-- API Key -->
        <div class="setting-card relative overflow-hidden rounded-2xl p-6 flex flex-col gap-4">
          <div class="absolute inset-0 bg-white/30 backdrop-blur-md border border-white/30 rounded-2xl"></div>
          <div class="relative flex flex-col gap-2">
            <label class="text-gray-700 font-semibold">🔑 API Key</label>
            <input v-model="settings.apiKey" type="text"
              class="mt-1 block w-full rounded-xl border-gray-300 bg-white/60 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-300 h-12 text-base px-4">
            <button @click="saveApiKey"
              class="w-full mt-2 bg-black text-white rounded-lg py-2 hover:bg-white hover:text-black border border-black transition-all duration-300">保存</button>
          </div>
        </div>
        <!-- 自动刷新 -->
        <div class="setting-card relative overflow-hidden rounded-2xl p-6 flex flex-col gap-4">
          <div class="absolute inset-0 bg-white/30 backdrop-blur-md border border-white/30 rounded-2xl"></div>
          <div class="relative flex flex-col gap-2">
            <label class="text-gray-700 font-semibold">🔄 自动刷新</label>
            <div class="flex items-center gap-2">
              <input v-model="settings.autoRefresh" type="checkbox"
                class="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
              <span>启用自动刷新</span>
            </div>
            <label class="text-gray-700">刷新间隔（秒）</label>
            <input v-model.number="settings.autoRefreshInterval" type="number"
              class="mt-1 block w-full rounded-xl border-gray-300 bg-white/60 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-300 h-12 text-base px-4">
            <button @click="saveAutoRefresh"
              class="w-full mt-2 bg-black text-white rounded-lg py-2 hover:bg-white hover:text-black border border-black transition-all duration-300">保存</button>
          </div>
        </div>
        <!-- 思考输出 -->
        <div class="setting-card relative overflow-hidden rounded-2xl p-6 flex flex-col gap-4">
          <div class="absolute inset-0 bg-white/30 backdrop-blur-md border border-white/30 rounded-2xl"></div>
          <div class="relative flex flex-col gap-2">
            <label class="text-gray-700 font-semibold">💡 思考输出</label>
            <div class="flex items-center gap-2">
              <input v-model="settings.outThink" type="checkbox"
                class="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
              <span>启用思考输出</span>
            </div>
            <button @click="saveOutThink"
              class="w-full mt-2 bg-black text-white rounded-lg py-2 hover:bg-white hover:text-black border border-black transition-all duration-300">保存</button>
          </div>
        </div>
        <!-- 搜索信息模式 -->
        <div class="setting-card relative overflow-hidden rounded-2xl p-6 flex flex-col gap-4">
          <div class="absolute inset-0 bg-white/30 backdrop-blur-md border border-white/30 rounded-2xl"></div>
          <div class="relative flex flex-col gap-2">
            <label class="text-gray-700 font-semibold">🔍 搜索信息显示模式</label>
            <select v-model="settings.searchInfoMode"
              class="mt-1 block w-full rounded-xl border-gray-300 bg-white/60 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-300 h-12 text-base px-4">
              <option value="table">表格模式</option>
              <option value="text">文本模式</option>
            </select>
            <button @click="saveSearchInfoMode"
              class="w-full mt-2 bg-black text-white rounded-lg py-2 hover:bg-white hover:text-black border border-black transition-all duration-300">保存</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const settings = ref({
  apiKey: localStorage.getItem('apiKey'),
  defaultHeaders: '',
  defaultCookie: '',
  autoRefresh: false,
  autoRefreshInterval: 21600,
  outThink: false,
  searchInfoMode: 'table'
})

const loadSettings = async () => {
  try {
    const res = await axios.get('/api/settings', {
      headers: {
        'Authorization': localStorage.getItem('apiKey')
      }
    })
    settings.value.apiKey = res.data.apiKey
    settings.value.defaultHeaders = JSON.stringify(res.data.defaultHeaders)
    settings.value.defaultCookie = res.data.defaultCookie
    settings.value.autoRefresh = res.data.autoRefresh
    settings.value.autoRefreshInterval = res.data.autoRefreshInterval
    settings.value.outThink = res.data.outThink
    settings.value.searchInfoMode = res.data.searchInfoMode
  } catch (error) {
    console.error('加载设置失败:', error)
  }
}

const saveApiKey = async () => {
  try {
    await axios.post('/api/setApiKey', { apiKey: settings.value.apiKey }, {
      headers: { 'Authorization': localStorage.getItem('apiKey') || '' }
    })
    alert('API Key保存成功')
  } catch (error) {
    alert('API Key保存失败: ' + error.message)
  }
}
const saveAutoRefresh = async () => {
  try {
    await axios.post('/api/setAutoRefresh', {
      autoRefresh: settings.value.autoRefresh,
      autoRefreshInterval: settings.value.autoRefreshInterval
    }, {
      headers: { 'Authorization': localStorage.getItem('apiKey') || '' }
    })
    alert('自动刷新设置保存成功')
  } catch (error) {
    alert('自动刷新设置保存失败: ' + error.message)
  }
}
const saveOutThink = async () => {
  try {
    await axios.post('/api/setOutThink', { outThink: settings.value.outThink }, {
      headers: { 'Authorization': localStorage.getItem('apiKey') || '' }
    })
    alert('思考输出设置保存成功')
  } catch (error) {
    alert('思考输出设置保存失败: ' + error.message)
  }
}
const saveSearchInfoMode = async () => {
  try {
    await axios.post('/api/search-info-mode', { searchInfoMode: settings.value.searchInfoMode }, {
      headers: { 'Authorization': localStorage.getItem('apiKey') || '' }
    })
    alert('搜索信息模式保存成功')
  } catch (error) {
    alert('搜索信息模式保存失败: ' + error.message)
  }
}

onMounted(() => {
  loadSettings()
})
</script>

<style lang="css" scoped>
.setting-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.3));
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.10);
  transition: box-shadow 0.3s, transform 0.3s;
  position: relative;
}

.setting-card:hover {
  box-shadow: 0 12px 36px 0 rgba(31, 38, 135, 0.18);
  transform: translateY(-2px) scale(1.01);
}

.action-button {
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}
</style>