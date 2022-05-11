/*
 * @Author: soporior
 * @Date: 2022-05-05 10:10:10
 * @LastEditors: soporior
 * @LastEditTime: 2022-05-10 15:57:13
 * @FilePath: \tianditudemo\src\router\index.ts
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
  },
  {
    path: '/about',
    name: 'About',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/About.vue')
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
