/**
 * LoadingSpinner Component Tests
 *
 * Tests for the loading spinner component.
 */

import React from 'react';
import {render, screen} from '@testing-library/react';
import {LoadingSpinner} from '@/components/ui/LoadingSpinner';

describe('LoadingSpinner', () => {
    it('renders without message by default', () => {
        const {container} = render(<LoadingSpinner/>);

        // Should have spinner but no text content
        expect(container.querySelector('.animate-spin')).toBeInTheDocument();
        expect(container.querySelector('p')).not.toBeInTheDocument();
    });

    it('renders with custom message', () => {
        render(<LoadingSpinner message="Please wait..."/>);

        expect(screen.getByText('Please wait...')).toBeInTheDocument();
    });

    it('renders without message when empty string provided', () => {
        const {container} = render(<LoadingSpinner message=""/>);

        expect(container.querySelector('p')).not.toBeInTheDocument();
    });

    it('applies custom className', () => {
        const {container} = render(<LoadingSpinner className="test-class"/>);

        expect(container.firstChild).toHaveClass('test-class');
    });

    it('renders spinner animation', () => {
        const {container} = render(<LoadingSpinner/>);

        // Check for the animated spinner
        const spinner = container.querySelector('.animate-spin');
        expect(spinner).toBeInTheDocument();
    });

    it('applies correct size classes', () => {
        const {container: smContainer} = render(<LoadingSpinner size="sm"/>);
        const {container: mdContainer} = render(<LoadingSpinner size="md"/>);
        const {container: lgContainer} = render(<LoadingSpinner size="lg"/>);

        expect(smContainer.querySelector('.w-4')).toBeInTheDocument();
        expect(mdContainer.querySelector('.w-8')).toBeInTheDocument();
        expect(lgContainer.querySelector('.w-10')).toBeInTheDocument();
    });
});

