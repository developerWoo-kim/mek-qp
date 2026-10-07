import { createRouter, createWebHistory } from 'vue-router';
import HomeView from './views/HomeView.vue';
import QuoteView from './views/QuoteView.vue';

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomeView },
    { path: '/quotes/:id', component: QuoteView, props: true },
  ],
});
