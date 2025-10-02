import { Button } from '@/components/ui/button'
import { http } from '@services/http'
import { toast } from '@utils/toast'
import { useState } from 'react'

export default function TestShortLink() {
  const [loading, setLoading] = useState(false)

  const testCreate = async () => {
    setLoading(true)
    try {
      const res = await http.post('PostShortLinkCreate', {
        originalUrl: 'https://www.google.com',
        title: 'Test Short Link',
        description: 'This is a test short link',
        tags: ['test', 'demo'],
      })

      if (res.isSuccess) {
        toast('创建成功', { type: 'success' })
        console.log('Created short link:', res.data)
      } else {
        toast(res.msg || '创建失败', { type: 'error' })
      }
    } catch (error) {
      console.error('Error:', error)
      toast('请求失败', { type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const testList = async () => {
    setLoading(true)
    try {
      const res = await http.get('GetShortLinkList', {
        page: 1,
        pageSize: 10,
      })

      if (res.isSuccess) {
        toast('获取成功', { type: 'success' })
        console.log('Short links:', res.data)
      } else {
        toast(res.msg || '获取失败', { type: 'error' })
      }
    } catch (error) {
      console.error('Error:', error)
      toast('请求失败', { type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">短链功能测试</h1>
      <div className="space-x-4">
        <Button onClick={testCreate} disabled={loading}>
          {loading ? '测试中...' : '测试创建短链'}
        </Button>
        <Button onClick={testList} disabled={loading}>
          {loading ? '测试中...' : '测试获取短链列表'}
        </Button>
      </div>
    </div>
  )
}
