import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LegacyResetDialog from '@/components/LegacyResetDialog';

afterEach(cleanup);

describe('Conferma reset archivio legacy', () => {
  it('richiede esattamente RESET prima di eliminare i dati', async () => {
    const onConfirm = vi.fn().mockResolvedValue(true);
    render(<LegacyResetDialog open onOpenChange={vi.fn()} onConfirm={onConfirm} />);
    const input = screen.getByLabelText('Scrivi RESET per confermare');
    const submit = screen.getByRole('button', { name: 'Resetta e inizia da zero' });
    for (const value of ['', 'reset', 'RESE', ' RESET ']) {
      fireEvent.change(input, { target: { value } });
      fireEvent.click(submit);
      expect(onConfirm).not.toHaveBeenCalled();
    }
    fireEvent.change(input, { target: { value: 'RESET' } });
    fireEvent.click(submit);
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
  });

  it('annullare non elimina i dati', () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(<LegacyResetDialog open onOpenChange={onOpenChange} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button', { name: 'Annulla' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('mantiene aperta la conferma se il reset fallisce', async () => {
    const onOpenChange = vi.fn();
    render(<LegacyResetDialog open onOpenChange={onOpenChange} onConfirm={vi.fn().mockResolvedValue(false)} />);
    fireEvent.change(screen.getByLabelText('Scrivi RESET per confermare'), { target: { value: 'RESET' } });
    fireEvent.click(screen.getByRole('button', { name: 'Resetta e inizia da zero' }));
    await screen.findByRole('alert');
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});