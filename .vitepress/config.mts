import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "My Awesome Project111",
  description: "A VitePress Site111",
  outDir: 'docs',
  base: "/docs/",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Examples', link: '/markdown-examples' }
    ],

    sidebar: [
      {
        text: 'Examples',
        items: [
          { text: 'Markdown Examples', link: '/markdown-examples' },
          { text: 'Runtime API Examples', link: '/api-examples' },
          { text: 'file', link: '/file' },
          { text: 'FormData', link: '/FormData' },
          { text: 'multer', link: '/multer' },
          { text: 'elementPlus目录结构', link: '/elementPlus' },
          { text: 'DefineComponent', link: '/DefineComponent' },
          { text: 'sfc类型声明', link: '/sfcType' },
          { text: '埋点核心代码', link: '/埋点核心代码' },
          { text: '埋点笔记', link: '/埋点笔记' },
        ]
      }
    ],

    // 启用本地搜索
    search: {
      provider: 'local'
    },

    // 最后更新时间
    lastUpdated: {
      text: '最后更新于',
      formatOptions: {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }
    },

    // 页脚配置
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2023-present My Project'
    },

    // 编辑链接
    editLink: {
      pattern: 'https://github.com/yourname/repo/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页'
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    ]
  }
})
