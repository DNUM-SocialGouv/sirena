import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  addons: ['@storybook/addon-docs'],
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],
  previewHead: (head) => `
    <link rel="apple-touch-icon" href="./node_modules/@codegouvfr/react-dsfr/favicon/apple-touch-icon.png" />
    <link rel="icon" href="./node_modules/@codegouvfr/react-dsfr/favicon/favicon.svg" type="image/svg+xml" />
    <link rel="shortcut icon" href="./node_modules/@codegouvfr/react-dsfr/favicon/favicon.ico" type="image/x-icon" />
    <link rel="manifest" href="./node_modules/@codegouvfr/react-dsfr/favicon/manifest.webmanifest" crossorigin="use-credentials" />

    <link rel="stylesheet" href="./node_modules/@codegouvfr/react-dsfr/main.css" />
    ${head}
  `,
};

export default config;
