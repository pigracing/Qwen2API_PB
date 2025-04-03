<template>
  <div class="flex flex-col items-center justify-center w-screen h-screen">
    <div
      class="flex flex-col items-center w-4/5 h-1/2 bg-opacity-50 bg-white rounded-3xl shadow-xl border-2 border-gray-200">
      <h1 class="block mt-24 mb-10 text-2xl font-bold">管理员身份验证</h1>
      <input type="text"
        class="w-4/5 h-16 rounded-2xl bg-opacity-80 bg-white border-2 border-gray-100 pl-10 placeholder:text-gray-500"
        placeholder="请输入管理员账号" v-model="apiKey">
      <button class="mt-10 w-4/5 h-16 rounded-2xl bg-opacity-65 border-2 border-black bg-black text-white"
        @click="handleLogin">登录</button>
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'

const router = useRouter()
const apiKey = ref('')

const handleLogin = async () => {
  try {
    const res = await axios.post('/api/verify', {
      apiKey: apiKey.value
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
    if (res.data.status == 200) {     
      localStorage.setItem('apiKey', apiKey.value)
      router.push({ path: '/', replace: true })
    } else {
      alert('apiKey 校验失败,请重新输入!')
    }
  } catch (err) {
    alert('apiKey 校验失败,请重新输入!')
  }
}

</script>

<style lang="css" scoped></style>