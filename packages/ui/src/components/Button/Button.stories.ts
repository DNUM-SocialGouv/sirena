import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  component: Button,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    label: 'Click me',
  },
};

export const WithClick: Story = {
  args: {
    label: 'Click me (with action)',
    onClick: () => alert('Button clicked!'),
  },
};
