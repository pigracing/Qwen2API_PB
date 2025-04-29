<template>
  <div class="w-full min-h-screen p-4">
    <div class="container mx-auto">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 px-4 space-y-4 md:space-y-0 pt-5">
        <h1 class="text-4xl font-bold">Token Manager <span class="text-gray-500 text-sm">by 兜豆子</span></h1>
        <div class="flex flex-col sm:flex-row w-full md:w-auto space-y-3 sm:space-y-0 sm:space-x-4">
          <button @click="showAddModal = true" 
                  class="action-button font-bold border border-green-200 bg-green-50 text-green-900 px-4 py-2 rounded-xl shadow-sm hover:bg-green-100 hover:border-green-400 transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0">
            添加账号
          </button>
          <router-link to="/settings" 
                       class="action-button font-bold border border-blue-200 bg-blue-50 text-blue-900 px-4 py-2 rounded-xl shadow-sm hover:bg-blue-100 hover:border-blue-400 transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 text-center">
            系统设置
          </router-link>
        </div>
      </div>

      <!-- Token列表 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
        <div v-for="token in tokens" 
             :key="token.email" 
             class="token-card group relative overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-2xl">
          <div class="absolute inset-0 bg-white/30 backdrop-blur-md border border-white/30"></div>
          <div class="relative p-6 flex flex-col gap-4">
            <div class="flex flex-col space-y-3">
              <div class="relative flex items-center bg-blue-50/80 rounded-lg px-2 py-1">
                <div class="overflow-x-auto scrollbar-hide flex-1 flex items-center space-x-2">
                  <span class="text-gray-700 min-w-[96px] text-left font-semibold">📧 Email:</span>
                  <span class="font-medium whitespace-nowrap text-left">{{ token.email }}</span>
                </div>
                <button @click="copyToClipboard(token.email)" class="absolute right-2 opacity-0 hover:opacity-100 transition-opacity bg-blue-200 hover:bg-blue-300 rounded px-2 py-1 text-base">📋</button>
              </div>
              <div class="relative flex items-center bg-blue-50/80 rounded-lg px-2 py-1">
                <div class="overflow-x-auto scrollbar-hide flex-1 flex items-center space-x-2">
                  <span class="text-gray-700 min-w-[96px] text-left font-semibold">🔑 Passwd:</span>
                  <span class="font-medium whitespace-nowrap text-left">{{ token.password }}</span>
                </div>
                <button @click="copyToClipboard(token.password)" class="absolute right-2 opacity-0 hover:opacity-100 transition-opacity bg-blue-200 hover:bg-blue-300 rounded px-2 py-1 text-base">📋</button>
              </div>
              <div class="relative flex items-center bg-blue-50/80 rounded-lg px-2 py-1">
                <div class="overflow-x-auto scrollbar-hide flex-1 flex items-center space-x-2">
                  <span class="text-gray-700 min-w-[96px] text-left font-semibold">🔐 Token:</span>
                  <span class="font-medium whitespace-nowrap text-left text-sm">{{ token.token }}</span>
                </div>
                <button @click="copyToClipboard(token.token)" class="absolute right-2 opacity-0 hover:opacity-100 transition-opacity bg-blue-200 hover:bg-blue-300 rounded px-2 py-1 text-base">📋</button>
              </div>
              <div class="relative flex items-center bg-blue-50/80 rounded-lg px-2 py-1">
                <div class="overflow-x-auto scrollbar-hide flex-1 flex items-center space-x-2">
                  <span class="text-gray-700 min-w-[96px] text-left font-semibold">⏰ Expire:</span>
                  <span class="font-medium whitespace-nowrap text-left">{{ new Date(token.expires * 1000).toLocaleString() }}</span>
                </div>
                <button @click="copyToClipboard(new Date(token.expires * 1000).toLocaleString())" class="absolute right-2 opacity-0 hover:opacity-100 transition-opacity bg-blue-200 hover:bg-blue-300 rounded px-2 py-1 text-base">📋</button>
              </div>
            </div>
            
            <div class="pt-4 mt-auto border-t border-gray-200/50">
              <button @click="deleteToken(token.email)" 
                      class="w-full group-hover:bg-red-50 text-red-600 py-2 rounded-lg transition-all duration-300 hover:bg-red-100">
                删除账号
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加账号模态框 -->
    <div v-if="showAddModal" 
         class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
         @click.self="showAddModal = false">
      <div class="relative bg-white/80 backdrop-blur-lg rounded-2xl p-6 w-11/12 max-w-md transform transition-all duration-300 scale-100 opacity-100">
        <div class="flex mb-6 border-b border-gray-200">
          <button :class="['flex-1 py-2 font-bold transition-all rounded-t-xl duration-300', addMode==='single' ? 'text-gray-600 border-b-2 border-gray-500 bg-gray-50/60' : 'text-gray-500 bg-transparent']" @click="addMode='single'">单账号添加</button>
          <button :class="['flex-1 py-2 font-bold transition-all rounded-t-xl duration-300', addMode==='batch' ? 'text-gray-600 border-b-2 border-gray-500 bg-gray-50/60' : 'text-gray-500 bg-transparent']" @click="addMode='batch'">批量添加</button>
        </div>
        <transition name="fade" mode="out-in">
          <div v-if="addMode==='single'" key="single">
            <h2 class="text-xl font-bold mb-4">添加账号</h2>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Email</label>
                <input v-model="newAccount.email" type="email" 
                       class="mt-1 block w-full rounded-xl border-gray-300 bg-white/50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-300 h-12 text-base px-4">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Password</label>
                <input v-model="newAccount.password" type="password" 
                       class="mt-1 block w-full rounded-xl border-gray-300 bg-white/50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-300 h-12 text-base px-4">
              </div>
              <div class="flex justify-end space-x-4 pt-4">
                <button @click="showAddModal = false" 
                        class="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-all duration-300">
                  取消
                </button>
                <button @click="addToken" 
                        class="px-4 py-2 rounded-xl bg-black text-white hover:bg-white hover:text-black transition-all duration-300">
                  添加
                </button>
              </div>
            </div>
          </div>
          <div v-else key="batch">
            <h2 class="text-xl font-bold mb-4 px-4">批量添加账号</h2>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 px-4 pb-2">账号列表（每行一个，格式：email:password）</label>
                <textarea v-model="batchAccounts" rows="6" class="mt-1 block w-full rounded-xl border-gray-300 bg-white/50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-300 h-36 text-base px-4 py-3 resize-none"></textarea>
              </div>
              <div class="flex justify-end space-x-4 pt-4">
                <button @click="showAddModal = false" 
                        class="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-all duration-300">
                  取消
                </button>
                <button @click="addBatchTokens" 
                        class="px-4 py-2 rounded-xl bg-black text-white hover:bg-white hover:text-black transition-all duration-300">
                  批量添加
                </button>
              </div>
            </div>
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const tokens = ref([])
const showAddModal = ref(false)
const addMode = ref('single')
const newAccount = ref({
  email: '',
  password: ''
})
const batchAccounts = ref('')

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    // 可以添加一个轻提示，比如使用 Toast 组件
    alert('已复制到剪贴板')
  } catch (err) {
    console.error('复制失败:', err)
  }
}

const getTokens = async () => {
  try {
    const res = await axios.get('/api/getAllAccounts', {
      headers: {
        'Authorization': localStorage.getItem('apiKey') || ''
      }
    })
    tokens.value = res.data.data
  } catch (error) {
    console.error('获取Token列表失败:', error)
    alert('获取Token列表失败: ' + error.message)
  }
}

const addToken = async () => {
  try {
    await axios.post('/api/setAccount', newAccount.value, {
      headers: {
        'Authorization': localStorage.getItem('apiKey') || ''
      }
    })
    showAddModal.value = false
    newAccount.value = { email: '', password: '' }
    await getTokens()
    alert('添加账号成功')
  } catch (error) {
    console.error('添加账号失败:', error)
    alert('添加账号失败: ' + error.message)
  }
}

const addBatchTokens = async () => {
  try {
    await axios.post('/api/setAccounts', { accounts: batchAccounts.value }, {
      headers: {
        'Authorization': localStorage.getItem('apiKey') || ''
      }
    })
    showAddModal.value = false
    batchAccounts.value = ''
    await getTokens()
    alert('批量添加任务已提交')
  } catch (error) {
    console.error('批量添加失败:', error)
    alert('批量添加失败: ' + error.message)
  }
}

const deleteToken = async (email) => {
  if (!confirm('确定要删除此账号吗？')) return
  
  try {
    await axios.delete('/api/deleteAccount', {
      data: { email },
      headers: {
        'Authorization': localStorage.getItem('apiKey') || ''
      }
    })
    await getTokens()
    alert('删除账号成功')
  } catch (error) {
    console.error('删除账号失败:', error)
    alert('删除账号失败: ' + error.message)
  }
}

onMounted(() => {
  getTokens()
})
</script>

<style lang="css" scoped>
@media (max-width: 640px) {
  .container {
    padding: 0;
  }
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
.fade-enter-to, .fade-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.token-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.3));
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
  transform: translateY(0);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.token-card:hover {
  transform: translateY(-5px);
}

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

@keyframes slideIn {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.token-card {
  animation: slideIn 0.5s ease-out;
  animation-fill-mode: both;
}

.token-card:nth-child(3n+1) { animation-delay: 0.1s; }
.token-card:nth-child(3n+2) { animation-delay: 0.2s; }
.token-card:nth-child(3n+3) { animation-delay: 0.3s; }

.overflow-x-auto {
  position: relative;
  cursor: pointer;
}

.overflow-x-auto::after {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 24px;
  background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.8));
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s;
}

.overflow-x-auto:hover::after {
  opacity: 1;
}
</style>