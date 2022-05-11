/*
 * @Author: soporior
 * @Date: 2022-05-05 10:10:10
 * @LastEditors: soporior
 * @LastEditTime: 2022-05-10 13:34:37
 * @FilePath: \tianditudemo\src\main.ts
 */
import { createApp } from 'vue'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './registerServiceWorker'
import router from './router'

createApp(App).use(router).use(ElementPlus).mount('#app')

