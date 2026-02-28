export default defineNuxtConfig({
  ssr: false,
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      meta: [
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'
        }
      ]
    }
  }
})
