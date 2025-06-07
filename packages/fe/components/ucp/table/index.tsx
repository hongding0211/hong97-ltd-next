import { Button } from '@/components/ui/button'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfigListResponseDto } from '@server/modules/ucp/dto/config-list'
import { useTranslation } from 'next-i18next'

export type TableAction = 'edit' | 'delete' | 'duplicate'

type TableProps = {
  items: ConfigListResponseDto['data']
  onAction?: (
    action: TableAction,
    item: ConfigListResponseDto['data'][number],
  ) => void
  page: number
  total: number
  onPageChange?: (page: number) => void
  pageSize: number
}

export const UCPTable: React.FC<TableProps> = (props) => {
  const { items, onAction, page, total, onPageChange, pageSize } = props

  const { t } = useTranslation('tools')

  const pageCount = Math.ceil(total / pageSize)

  if (items?.length === undefined) {
    return null
  }

  if (!items.length) {
    return (
      <div className="flex text-sm text-neutral-500 mt-8 justify-center w-full">
        - {t('items.ucp.detail.noData')} -
      </div>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              {t('items.ucp.detail.index')}
            </TableHead>
            <TableHead className="max-w-[calc(100%-150px)]">
              {t('items.ucp.detail.content')}
            </TableHead>
            <TableHead className="w-[100px]">
              {t('items.ucp.detail.action')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((e, i) => (
            <TableRow key={e.id}>
              <TableCell className="font-medium">{i + 1}</TableCell>
              <TableCell
                className="truncate max-w-0 cursor-pointer"
                onClick={() => onAction?.('edit', e)}
              >
                {JSON.stringify(e.raw)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-x-2">
                  <Button
                    size="sm"
                    variant="link"
                    onClick={() => onAction?.('edit', e)}
                    className="!p-0"
                  >
                    {t('items.ucp.detail.edit')}
                  </Button>
                  <Button
                    size="sm"
                    variant="link"
                    onClick={() => onAction?.('duplicate', e)}
                    className="!p-0"
                  >
                    {t('items.ucp.detail.duplicate')}
                  </Button>
                  <Button
                    size="sm"
                    variant="link"
                    onClick={() => onAction?.('delete', e)}
                    className="!p-0"
                  >
                    {t('items.ucp.detail.delete')}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {pageCount > 1 && (
        <Pagination className="mt-8 !justify-start">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious onClick={() => onPageChange?.(page - 1)} />
            </PaginationItem>
            {Array.from({ length: pageCount }, (_, i) => i + 1).map(
              (pageNum) => (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    onClick={() => onPageChange?.(pageNum)}
                    isActive={pageNum === page}
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}
            <PaginationItem>
              <PaginationNext onClick={() => onPageChange?.(page + 1)} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </>
  )
}
