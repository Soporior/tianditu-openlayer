/*
 * @Author: soporior
 * @Date: 2022-05-05 10:10:10
 * @LastEditors: soporior
 * @LastEditTime: 2022-05-11 14:16:43
 * @FilePath: \tianditu-openlayer\src\router\index.ts
 */
import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import Home from '../views/Home.vue'
import Map from '../views/Map.vue'
const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Map',
    component: Map
  },
  {
    path: '/map',
    name: 'map',
    component: Map
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
