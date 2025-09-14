import { defineConfig } from '@tanstack/react-start/config'
import { createRouter } from './src/router'

export default defineConfig({
  router: createRouter,
})