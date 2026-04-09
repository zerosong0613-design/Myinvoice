import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { CreditNoteStatus } from '@/types'

const STATUS_CONFIG: Record<
  CreditNoteStatus,
  { label: string; className: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  draft: {
    label: '임시저장',
    variant: 'secondary',
    className: '',
  },
  sent: {
    label: '발행완료',
    variant: 'default',
    className: 'bg-blue-500 hover:bg-blue-600',
  },
  applied: {
    label: '적용됨',
    variant: 'default',
    className: 'bg-green-500 hover:bg-green-600',
  },
}

interface CreditNoteStatusBadgeProps {
  status: CreditNoteStatus
  className?: string
}

export default function CreditNoteStatusBadge({
  status,
  className,
}: CreditNoteStatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <Badge
      variant={config.variant}
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  )
}
