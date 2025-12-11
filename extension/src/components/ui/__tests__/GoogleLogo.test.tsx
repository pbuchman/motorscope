/**
 * GoogleLogo Component Tests
 *
 * Tests for the Google logo SVG component.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { GoogleLogo } from '@/components/ui/GoogleLogo';

describe('GoogleLogo', () => {
  it('renders SVG element', () => {
    const { container } = render(<GoogleLogo />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('applies default className', () => {
    const { container } = render(<GoogleLogo />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('w-4', 'h-4');
  });

  it('applies custom className', () => {
    const { container } = render(<GoogleLogo className="w-6 h-6" />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('w-6', 'h-6');
  });

  it('has aria-hidden for accessibility', () => {
    const { container } = render(<GoogleLogo />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders all four Google brand color paths', () => {
    const { container } = render(<GoogleLogo />);

    const paths = container.querySelectorAll('path');
    expect(paths).toHaveLength(4);

    // Check Google brand colors are present
    const fills = Array.from(paths).map(p => p.getAttribute('fill'));
    expect(fills).toContain('#4285F4'); // Blue
    expect(fills).toContain('#34A853'); // Green
    expect(fills).toContain('#FBBC05'); // Yellow
    expect(fills).toContain('#EA4335'); // Red
  });

  it('has correct viewBox', () => {
    const { container } = render(<GoogleLogo />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
  });
});

