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
      { text: '埋点代码', link: '/tracking-code' }
    ],

    sidebar: [
      {
        text: '文件上传',
        items: [
          { text: '文件上传代码', link: '/file-code' },
          { text: '文件上传笔记', link: '/file-note' }
        ]
      },
      {
        text: '埋点',
        items: [
          { text: '埋点核心代码', link: '/tracking-code' },
          { text: '埋点笔记', link: '/tracking-note' },
        ]
      },
      {
        text: 'jQuery',
        items: [
          { text: 'jQuery代码', link: '/jq-code' }
        ]
      },
      {
        text: 'javascript',
        items: [
          { text: 'js第一部分', link: '/js' },
          { text: 'js第二部分', link: '/js2' }
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
