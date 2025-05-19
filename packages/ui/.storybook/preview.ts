import type { Preview } from '@storybook/react';
import '@codegouvfr/react-dsfr/main.css';
import { startReactDsfr } from '@codegouvfr/react-dsfr/spa';

startReactDsfr({
  defaultColorScheme: 'system',
  useLang: () => 'fr',
});

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
};

export default preview;
