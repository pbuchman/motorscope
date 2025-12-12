/**
 * StatusBadge Component Tests
 *
 * Tests for the listing status badge component.
 */

import React from 'react';
import {render, screen} from '../../../test-utils/renderHelpers';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {ListingStatus} from '@/types';

describe('StatusBadge', () => {
    it('renders ACTIVE status with correct text', () => {
        render(<StatusBadge status={ListingStatus.ACTIVE}/>);

        expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('renders ENDED status with correct text', () => {
        render(<StatusBadge status={ListingStatus.ENDED}/>);

        expect(screen.getByText('Ended')).toBeInTheDocument();
    });

    it('applies green styling for ACTIVE status', () => {
        render(<StatusBadge status={ListingStatus.ACTIVE}/>);

        const badge = screen.getByText('Active');
        expect(badge).toHaveClass('text-green-900');
    });

    it('applies red styling for ENDED status', () => {
        render(<StatusBadge status={ListingStatus.ENDED}/>);

        const badge = screen.getByText('Ended');
        expect(badge).toHaveClass('text-red-900');
    });

    it('applies additional custom className', () => {
        render(
            <StatusBadge status={ListingStatus.ACTIVE} className="custom-class"/>,
        );

        const badge = screen.getByText('Active');
        expect(badge).toHaveClass('custom-class');
    });
});

