import { createRouter, createWebHistory } from 'vue-router'
import axios from 'axios'

const routes = [
  {
    name: 'dashboard',
    path: '/',
    component: () => import('../views/dashboard.vue')
  },
  {
    name: 'auth',
    path: '/auth',
    component: () => import('../views/auth.vue')
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})


// 路由守卫
router.beforeEach(async (to, from, next) => {

  if (to.path === '/auth') {
    next()
  } else {
    const apiKey = localStorage.getItem('apiKey')
    if (!apiKey) {
      alert('请先设置身份验证apiKey')
      next({ path: '/auth' })
    } else {
      try {
        const verifyResponse = await axios.post('/api/verify', {
          apiKey: apiKey
        })

        if (verifyResponse.data.status === 200) {
          next()
        } else {
          localStorage.removeItem('apiKey')
          next({ path: '/auth' })
        }
      } catch (error) {
        localStorage.removeItem('apiKey')
        next({ path: '/auth' })
      }
    }
  }

})


export default router