import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Layout from '@/components/layout/Layout';

// Mock the components
vi.mock('@/components/layout/Header', () => ({
  default: () => <div data-testid="header">Header</div>,
}));

vi.mock('@/components/layout/BottomTabBar', () => ({
  default: () => <div data-testid="bottom-tab-bar">BottomTabBar</div>,
}));

describe('Layout', () => {
  it('renders children', () => {
    render(
      <BrowserRouter>
        <Layout>
          <div data-testid="test-child">Child Content</div>
        </Layout>
      </BrowserRouter>
    );
    expect(screen.getByTestId('test-child')).toBeInTheDocument();
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('bottom-tab-bar')).toBeInTheDocument();
  });
});
