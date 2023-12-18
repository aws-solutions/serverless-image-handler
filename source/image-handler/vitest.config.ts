// @ts-ignore
import { defineConfig, configDefaults } from "vitest/config"

export default defineConfig({
    test: {
        pool: "forks",
        reporters: ['json'],
        outputFile: 'test-output.json',
        exclude: [...configDefaults.exclude, '**/test/mana/**']
    },
})