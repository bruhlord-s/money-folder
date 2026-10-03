/// <reference types="vite/client" />

// Lets typescript-eslint (plain tsc) type `.vue` imports; vue-tsc uses the real SFC types.
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent
  export default component
}
