import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GoalForm from './GoalForm';

function renderForm(props = {}) {
  const onSubmit = vi.fn(() => ({}));
  render(<GoalForm open title="יעד חדש" onSubmit={onSubmit} onCancel={vi.fn()} {...props} />);
  return onSubmit;
}

describe('GoalForm', () => {
  it('shows the genre field only for genre goals', async () => {
    renderForm({ genres: ['מתח'] });
    expect(screen.queryByRole('combobox', { name: "ז'אנר *" })).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'סוג' }), 'genre');
    expect(screen.getByRole('combobox', { name: "ז'אנר *" })).toBeInTheDocument();
  });

  it('shows dates for a custom range and "recurring" only for monthly/yearly', async () => {
    renderForm();
    expect(screen.getByRole('checkbox', { name: 'מתחדש כל תקופה' })).toBeInTheDocument();
    expect(screen.queryByLabelText('מתאריך *')).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'תקופה' }), 'custom');
    expect(screen.getByLabelText('מתאריך *')).toBeInTheDocument();
    expect(screen.getByLabelText('עד תאריך *')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('submits the raw values', async () => {
    const onSubmit = renderForm();
    await userEvent.type(screen.getByRole('textbox', { name: 'שם היעד *' }), 'Goal');
    await userEvent.type(screen.getByRole('spinbutton', { name: 'כמות *' }), '3');
    await userEvent.click(screen.getByRole('checkbox', { name: 'מתחדש כל תקופה' }));
    await userEvent.click(screen.getByRole('button', { name: 'שמירה' }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Goal', target: '3', type: 'books', period: 'monthly', recurring: true }),
    );
  });

  it('shows the errors returned by onSubmit', async () => {
    renderForm({ onSubmit: () => ({ target: 'הכמות חייבת להיות מספר שלם גדול מ‑0' }) });
    await userEvent.click(screen.getByRole('button', { name: 'שמירה' }));
    expect(screen.getByText('הכמות חייבת להיות מספר שלם גדול מ‑0')).toBeInTheDocument();
  });

  it('starts from the initial values when editing and can lock the period', () => {
    renderForm({
      initial: { name: 'Old', type: 'pages', target: '100', period: 'yearly', recurring: true },
      lockPeriod: true,
    });
    expect(screen.getByRole('textbox', { name: 'שם היעד *' })).toHaveValue('Old');
    expect(screen.getByRole('combobox', { name: 'סוג' })).toHaveValue('pages');
    expect(screen.getByRole('combobox', { name: 'תקופה' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'מתחדש כל תקופה' })).toBeChecked();
  });
});
