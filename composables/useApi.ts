import { computed } from "vue"

export const useApi = () => {
  const config = useRuntimeConfig()

  const apiBaseUrl = computed(() => String(config.public.apiBaseUrl || "").replace(/\/+$/, ""))

  const buildApiUrl = (path: string) => {
    const normalizedPath = path.startsWith("/") ? path.slice(1) : path
    return `${apiBaseUrl.value}/${normalizedPath}`
  }

  const apiFetch = <T>(path: string, options?: Parameters<typeof $fetch>[1]) => {
    return $fetch<T>(buildApiUrl(path), options)
  }

  return {
    apiBaseUrl,
    buildApiUrl,
    apiFetch
  }
}
