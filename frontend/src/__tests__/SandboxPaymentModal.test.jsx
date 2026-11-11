import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SandboxPaymentModal from '../components/SandboxPaymentModal';
import { paymentAPI } from '../services/api';

describe('SandboxPaymentModal Component', () => {
  const samplePayment = {
    paymentId: 42,
    orderId: 9,
    orderNumber: 'VOG-2026-0042',
    paymentMethod: 'UPI',
    amount: 4599,
    gatewayMode: 'SANDBOX',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('authorizes payment as PAID when user selects Card and authorizes', async () => {
    const onSuccess = vi.fn();
    const confirmSpy = vi.spyOn(paymentAPI, 'confirm').mockResolvedValue({
      data: { ...samplePayment, paymentStatus: 'PAID', paymentMethod: 'CARD' },
    });

    render(
      <SandboxPaymentModal
        isOpen={true}
        payment={samplePayment}
        onSuccess={onSuccess}
        onFailure={vi.fn()}
        onPending={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('VOG-2026-0042')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Card' }));
    fireEvent.click(screen.getByRole('button', { name: /Authorize & Pay/i }));

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentId: 42,
          paymentStatus: 'PAID',
          paymentMethod: 'CARD',
        })
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('records simulated decline as FAILED and passes custom reason', async () => {
    const onFailure = vi.fn();
    const confirmSpy = vi.spyOn(paymentAPI, 'confirm').mockResolvedValue({
      data: { ...samplePayment, paymentStatus: 'FAILED', failureReason: 'Insufficient funds' },
    });

    render(
      <SandboxPaymentModal
        isOpen={true}
        payment={samplePayment}
        onSuccess={vi.fn()}
        onFailure={onFailure}
        onPending={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const reasonInput = screen.getByDisplayValue(/Declined by simulated issuing bank/i);
    fireEvent.change(reasonInput, { target: { value: 'Insufficient funds' } });
    fireEvent.click(screen.getByRole('button', { name: /Simulate Decline/i }));

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentId: 42,
          paymentStatus: 'FAILED',
          failureReason: 'Insufficient funds',
        })
      );
      expect(onFailure).toHaveBeenCalled();
    });
  });

  it('supports keeping payment in PENDING status', async () => {
    const onPending = vi.fn();
    const confirmSpy = vi.spyOn(paymentAPI, 'confirm').mockResolvedValue({
      data: { ...samplePayment, paymentStatus: 'PENDING' },
    });

    render(
      <SandboxPaymentModal
        isOpen={true}
        payment={samplePayment}
        onSuccess={vi.fn()}
        onFailure={vi.fn()}
        onPending={onPending}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Keep Pending/i }));

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentId: 42,
          paymentStatus: 'PENDING',
        })
      );
      expect(onPending).toHaveBeenCalled();
    });
  });
});
