// import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  addons: ['@storybook/addon-essentials', '@storybook/addon-interactions'],
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],
  docs: {
    autodocs: 'tag',
  },
  // async viteFinal(config) {
  //   const { mergeConfig } = await import('vite');

  //   return mergeConfig(config, {
  //     // Add dependencies to pre-optimization
  //     resolve: {
  //       alias: {
  //         '@': fileURLToPath(new URL('../src', import.meta.url)),
  //       },
  //     },
  //   });
  // },
};

export default config;
