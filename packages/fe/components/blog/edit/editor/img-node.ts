import { Node, nodeInputRule, ReactNodeViewRenderer } from '@tiptap/react'
import ImageUploader from './img-uploader'

export const ImgNode = Node.create({
  name: 'imgV2',
  group: 'block',
  atom: true,

 addAttributes() {
    return {
      images: {
        default: [],
        parseHTML: element => {
          const imagesAttr = element.getAttribute('images')
          try {
            return imagesAttr ? JSON.parse(imagesAttr) : []
          } catch {
            return []
          }
        },
        renderHTML: attributes => {
          return {
            images: JSON.stringify(attributes.images)
          }
        }
      },
      caption: {
        default: '',
        parseHTML: element => element.getAttribute('caption') || '',
        renderHTML: attributes => ({ caption: attributes.caption })
      },
      autoLoop: {
        default: false,
        parseHTML: element => element.getAttribute('autoloop') === 'true',
        renderHTML: attributes => ({ autoloop: attributes.autoLoop ? 'true' : 'false' })
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'ImagesV2',
        getAttrs: (dom) => {
          const imagesAttr = dom.getAttribute('images')
          const captionAttr = dom.getAttribute('caption')
          const autoLoopAttr = dom.getAttribute('autoLoop')
          
          // Remove outer braces if present: {[]} -> []
          const cleanedImages = imagesAttr ? imagesAttr.replace(/^\{(.*)\}$/, '$1') : '[]'
          
          return {
            images: JSON.parse(cleanedImages),
            caption: captionAttr || '',
            autoLoop: autoLoopAttr === 'true',
          }
        }
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['ImagesV2', HTMLAttributes, 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageUploader)
  },

  renderMarkdown: (node) => {
    const images = node.attrs?.images || []
    const caption = node.attrs?.caption || ''
    const autoLoop = node.attrs?.autoLoop || false
    
    const imagesJson = JSON.stringify(images)
    const captionProp = caption ? ` caption="${caption}"` : ''
    const autoLoopProp = autoLoop ? ` autoLoop={true}` : ''
    
    return `<ImagesV2 images={${imagesJson}}${captionProp}${autoLoopProp} />\n\n`
  },

  parseMarkdown: (token) => {
if (token.type === 'html') {
      const htmlContent = token.text || ''
      
      // 匹配 <ImagesV2 ... /> 标签
      const match = /<ImagesV2\s+images=\{(.*?)\}(\s+caption="(.*?)")?(\s+autoloop="(.*?)")?\s*\/>/.exec(htmlContent)
      
      if (match) {
        try {
          const images = JSON.parse(match[1])
          const caption = match[3] || ''
          const autoLoop = match[5] === 'true'
          
          return {
            type: 'imgV2',
            attrs: {
              images,
              caption,
              autoLoop
            }
          }
        } catch (e) {
          console.error('解析 images 失败:', e)
        }
      }
    }
    
    return null
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: /^:::img\s$/,
        type: this.type,
        getAttributes: () => ({
          images: [],
          caption: '',
          autoLoop: false,
        })
      })
    ]
  },
})