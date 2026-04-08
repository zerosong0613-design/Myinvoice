import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount)
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function generateDocNumber(prefix: string, sequence: number): string {
  const now = new Date()
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  return `${prefix}-${ym}-${String(sequence).padStart(3, '0')}`
}

export function calculateTax(subtotal: number, taxType: 'inclusive' | 'exclusive'): { subtotal: number; taxAmount: number; total: number } {
  if (taxType === 'inclusive') {
    const total = subtotal
    const taxAmount = Math.round(total - total / 1.1)
    return { subtotal: total - taxAmount, taxAmount, total }
  }
  const taxAmount = Math.round(subtotal * 0.1)
  return { subtotal, taxAmount, total: subtotal + taxAmount }
}
