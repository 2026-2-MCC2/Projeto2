import { mergeConfig } from 'vitest/config'

import viteConfig from './vite.config.js'

export default mergeConfig(viteConfig, {
  test: {
    include: ['src/**/*.test.{js,jsx}'],
  },
})
