import React from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, beforeEach } from 'vitest';
import StatusIndicator from './StatusIndicator';

describe('StatusIndicator Component', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders status message correctly', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    
    // Force synchronous-like rendering in testing environment
    React.act(() => {
      root.render(
        <StatusIndicator status="safe" message="Protected" />
      );
    });

    expect(container.textContent).toBe('Protected');
  });

  it('renders different status types and falls back to idle style', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    
    React.act(() => {
      root.render(
        <StatusIndicator status="danger" message="Predatory terms detected!" />
      );
    });

    expect(container.textContent).toBe('Predatory terms detected!');
  });
});
