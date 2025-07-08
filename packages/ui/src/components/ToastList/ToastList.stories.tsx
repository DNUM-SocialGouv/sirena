import { Toast } from '@base-ui-components/react';
import { Button } from '@codegouvfr/react-dsfr/Button';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ToastData, ToastList } from './ToastList';

const description = 'wip';

export default {
  title: 'Components/ToastList',
  component: ToastList,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: description,
      },
    },
  },
} as Meta;

type Story = StoryObj<typeof Toast>;

const ToastDemo = () => {
  const toastManager = Toast.useToastManager();

  function action() {
    const data: ToastData = {
      icon: 'fr-alert--success',
    };

    toastManager.add({
      title: 'Toast with custom data',
      description: 'dawddawdawdawdawd',
      data,
      timeout: 0,
    });
  }

  return <Button onClick={action}>Create custom toast</Button>;
};

export const Default: Story = {
  render: () => {
    return (
      <Toast.Provider limit={Infinity}>
        <ToastDemo />
        <Toast.Portal>
          <Toast.Viewport className="toast-list__viewport">
            <ToastList />
          </Toast.Viewport>
        </Toast.Portal>
      </Toast.Provider>
    );
  },
};
