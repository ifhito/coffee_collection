// API client utilities for frontend

const API_BASE = '/api'

export class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'APIError'
  }
}

// Local storage keys
const ACCESS_TOKEN_KEY = 'supabase_access_token'
const REFRESH_TOKEN_KEY = 'supabase_refresh_token'

// Token management
export const tokenStorage = {
  getAccessToken: (): string | null => {
    if (typeof window === 'undefined') return null
    const token = localStorage.getItem(ACCESS_TOKEN_KEY)
    console.log('Getting access token from localStorage:', token ? 'exists' : 'not found')
    return token
  },

  setTokens: (accessToken: string, refreshToken: string) => {
    if (typeof window === 'undefined') return
    console.log('Setting tokens to localStorage:', {
      accessToken: accessToken ? 'exists' : 'missing',
      refreshToken: refreshToken ? 'exists' : 'missing'
    })
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  },

  clearTokens: () => {
    if (typeof window === 'undefined') return
    console.log('Clearing tokens from localStorage')
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = tokenStorage.getAccessToken()

  console.log('Getting auth headers, token exists:', !!token)

  if (token) {
    return {
      'Authorization': `Bearer ${token}`,
    }
  }

  // 認証トークンがない場合でも、読み取り専用でAPIにアクセス可能
  return {}
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`
  const authHeaders = await getAuthHeaders()

  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers,
    },
    ...options,
  }

  console.log('=== API REQUEST DEBUG ===')
  console.log('URL:', url)
  console.log('Method:', config.method || 'GET')
  console.log('Headers:', config.headers)
  console.log('Body:', config.body)

  try {
    const response = await fetch(url, config)

    console.log('=== API RESPONSE DEBUG ===')
    console.log('Status:', response.status)
    console.log('StatusText:', response.statusText)
    console.log('Headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      console.log('Error response:', errorData)
      throw new APIError(response.status, errorData.error || 'Request failed')
    }

    const responseData = await response.json()
    console.log('Success response:', responseData)
    return responseData
  } catch (error) {
    console.error('=== API REQUEST ERROR ===', error)
    throw error
  }
}

// Bean API
export const beansAPI = {
  getAll: (params?: { archived?: boolean; limit?: number }) => {
    const searchParams = new URLSearchParams()
    if (params?.archived !== undefined) searchParams.set('archived', String(params.archived))
    if (params?.limit) searchParams.set('limit', String(params.limit))

    return apiRequest<any[]>(`/beans?${searchParams}`)
  },

  getById: (id: string) => {
    return apiRequest<any>(`/beans/${id}`)
  },

  create: (data: any) => {
    return apiRequest<{ id: string }>('/beans', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  update: (id: string, data: any) => {
    return apiRequest<{ message: string }>(`/beans/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  delete: (id: string) => {
    return apiRequest<{ message: string }>(`/beans/${id}`, {
      method: 'DELETE',
    })
  },
}

// Shop API
export const shopsAPI = {
  getAll: (type?: string) => {
    const searchParams = new URLSearchParams()
    if (type) searchParams.set('type', type)

    return apiRequest<any[]>(`/shops?${searchParams}`)
  },

  create: (data: any) => {
    return apiRequest<any>('/shops', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

// Tasting API
export const tastingsAPI = {
  save: (data: any) => {
    return apiRequest<{ message: string }>('/tastings', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
  remove: (beanId: string) => {
    return apiRequest<{ message: string }>('/tastings', {
      method: 'DELETE',
      body: JSON.stringify({ bean_batch_id: beanId }),
    })
  },
}

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await apiRequest<{ user: any; session: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })

    console.log('Login response:', {
      hasSession: !!response.session,
      hasAccessToken: !!response.session?.access_token,
      hasRefreshToken: !!response.session?.refresh_token
    })

    if (response.session?.access_token && response.session?.refresh_token) {
      tokenStorage.setTokens(response.session.access_token, response.session.refresh_token)
      console.log('Tokens stored successfully')
    } else {
      console.warn('No tokens in response:', response)
    }

    return response
  },

  logout: async () => {
    const response = await apiRequest<{ message: string }>('/auth/logout', {
      method: 'POST',
    })

    tokenStorage.clearTokens()
    return response
  },

  getUser: () => {
    console.log('Getting user, token available:', !!tokenStorage.getAccessToken())
    return apiRequest<{ user: any | null }>('/auth/user')
  },

  signup: async (email: string, password: string) => {
    const response = await apiRequest<{ user: any; session: any; message: string }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })

    if (response.session?.access_token && response.session?.refresh_token) {
      tokenStorage.setTokens(response.session.access_token, response.session.refresh_token)
    }

    return response
  },
}
