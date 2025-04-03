<template>
  <div class="w-full min-h-screen p-4">
    <div class="container mx-auto">
      <h1 class="text-2xl font-bold mb-6 px-4">Token 管理</h1>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        <div v-for="token in tokens" 
             :key="token.id" 
             class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-300">
          <div class="flex flex-col gap-3">
            <div class="flex items-center">
              <span class="text-gray-600 w-24">账号ID:</span>
              <span class="font-medium">{{ token.id }}</span>
            </div>
            <div class="flex items-center">
              <span class="text-gray-600 w-24">登录类型:</span>
              <span class="font-medium">{{ token.type }}</span>
            </div>
            <div class="flex items-center">
              <span class="text-gray-600 w-24">Email:</span>
              <span class="font-medium break-all">{{ token.username }}</span>
            </div>
            <div class="flex items-center">
              <span class="text-gray-600 w-24">Token:</span>
              <span class="font-medium break-all text-sm">{{ token.token }}</span>
            </div>
            <div class="flex items-center">
              <span class="text-gray-600 w-24">过期时间:</span>
              <span class="font-medium">{{ token.expiresAt }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const tokens = ref([])

const getTokens = async () => {
  const res = await axios.get('/api/info/getTokens')
  tokens.value = res.data.data
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
</style>